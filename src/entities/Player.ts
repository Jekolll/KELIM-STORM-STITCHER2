import Phaser from 'phaser';
import { PLAYER } from '../config/tuning';
import type { Vec, Rect } from '../utils/geometry';
import { clamp, normalize } from '../utils/geometry';
import { audio } from '../systems/AudioManager';

export interface PlayerInput {
  mx: number;
  my: number;
  dodge: boolean;
}

/**
 * Player rig: satu sprite master generated + transform animation
 * (bob, lean, squash) + contact shadow. Transform dipakai untuk
 * gerakan; pose tambahan disiapkan jika rig transform tidak cukup.
 */
export class Player {
  pos: Vec = { x: 480, y: 300 };
  hp = PLAYER.maxHp;
  radius = PLAYER.radius;
  alive = true;
  onHurt: (from: Vec) => void = () => {};
  onDeath: () => void = () => {};
  onDodge: () => void = () => {};

  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private vel: Vec = { x: 0, y: 0 };
  private lastMove: Vec = { x: 0, y: 0 };
  private dodgingMs = 0;
  private dodgeDir: Vec = { x: 0, y: 0 };
  dodgeCdMs = 0;
  private iframeMs = 0;
  private invulnMs = 0;
  private t = 0;
  private squash = 0;
  private deadT = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.sprite = scene.add.image(0, 0, 'tailor');
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.scale = PLAYER.displayImageH / 768;
    this.sprite.setDepth(10);
    this.shadow = scene.add.ellipse(0, 0, 44, 18, 0x14161d, 0.34);
    this.shadow.setDepth(9);
  }

  reset(x: number, y: number): void {
    this.pos = { x, y };
    this.hp = PLAYER.maxHp;
    this.alive = true;
    this.dodgingMs = 0;
    this.dodgeCdMs = 0;
    this.iframeMs = 0;
    this.invulnMs = 0;
    this.t = 0;
    this.squash = 0;
    this.deadT = 0;
    this.sprite.setAlpha(1);
    this.sprite.setRotation(0);
    this.sprite.clearTint();
    this.shadow.setAlpha(0.34);
  }

  get inIframes(): boolean {
    return this.iframeMs > 0 || this.invulnMs > 0;
  }

  update(dt: number, input: PlayerInput, arena: Rect): void {
    if (!this.alive) {
      // animasi kematian: rebah + redup
      this.deadT += dt * 1000;
      const k = clamp(this.deadT / 550, 0, 1);
      this.sprite.setRotation(k * 1.35);
      this.sprite.setAlpha(1 - k * 0.9);
      this.shadow.setAlpha(0.34 * (1 - k));
      this.syncVisual(0);
      return;
    }
    this.t += dt;
    this.dodgeCdMs = Math.max(0, this.dodgeCdMs - dt * 1000);
    this.iframeMs = Math.max(0, this.iframeMs - dt * 1000);
    this.invulnMs = Math.max(0, this.invulnMs - dt * 1000);
    this.squash = Math.max(0, this.squash - dt * 4.5);

    if (input.dodge && this.dodgingMs <= 0 && this.dodgeCdMs <= 0) {
      const dir =
        input.mx !== 0 || input.my !== 0
          ? { x: input.mx, y: input.my }
          : this.lastMove;
      this.dodgeDir = normalize(dir);
      if (this.dodgeDir.x === 0 && this.dodgeDir.y === 0) this.dodgeDir = { x: -1, y: 0 };
      this.dodgingMs = PLAYER.dodgeMs;
      this.dodgeCdMs = PLAYER.dodgeCdMs;
      this.iframeMs = PLAYER.dodgeIframeMs;
      this.squash = 1;
      audio.play('dodge');
      this.onDodge();
    }

    let vx = 0;
    let vy = 0;
    if (this.dodgingMs > 0) {
      this.dodgingMs -= dt * 1000;
      vx = this.dodgeDir.x * PLAYER.dodgeSpeed;
      vy = this.dodgeDir.y * PLAYER.dodgeSpeed;
    } else {
      const n = normalize({ x: input.mx, y: input.my });
      vx = n.x * PLAYER.speed;
      vy = n.y * PLAYER.speed;
      if (n.x !== 0 || n.y !== 0) this.lastMove = n;
    }
    this.vel = { x: vx, y: vy };
    this.pos.x = clamp(this.pos.x + vx * dt, arena.x + this.radius, arena.x + arena.w - this.radius);
    this.pos.y = clamp(this.pos.y + vy * dt, arena.y + this.radius, arena.y + arena.h - this.radius);

    // blink immunity
    const blink = this.invulnMs > 0 && Math.floor(this.t * 20) % 2 === 0;
    this.sprite.setAlpha(blink ? 0.45 : 1);
    this.syncVisual(dt);
  }

  private syncVisual(dt: number): void {
    const speed = Math.hypot(this.vel.x, this.vel.y);
    const moving = speed > 10;
    const bobAmp = moving ? 2.2 : 1.2;
    const bobFreq = moving ? 11 : 4;
    const bob = Math.sin(this.t * bobFreq) * bobAmp;
    const lean = moving ? clamp(this.vel.x / PLAYER.speed, -1, 1) * 0.09 : 0;
    const sx = 1 + this.squash * (this.dodgingMs > 0 ? 0.18 : 0.06);
    const sy = 1 - this.squash * 0.12;
    const base = PLAYER.displayImageH / 768;
    const d = this.alive ? Math.floor(this.pos.y) : 600;
    this.sprite.setDepth(d);
    this.shadow.setDepth(d - 1);
    this.sprite.setPosition(this.pos.x, this.pos.y - 20 + bob * 0.4);
    this.sprite.setScale(base * sx, base * sy);
    this.sprite.setRotation(lean);
    this.sprite.setFlipX(this.vel.x < -5 ? true : this.vel.x > 5 ? false : this.sprite.flipX);
    void dt;
    this.shadow.setPosition(this.pos.x, this.pos.y + 22);
    const sScale = 1 - this.squash * 0.15;
    this.shadow.setScale(sScale, 1);
  }

  /**
   * Terkena damage. Return true jika damage benar-benar diterapkan.
   */
  takeHit(from: Vec): boolean {
    if (!this.alive || this.iframeMs > 0 || this.invulnMs > 0) return false;
    this.hp -= 1;
    this.invulnMs = PLAYER.hitInvulnMs;
    audio.play('hurt');
    // knockback kecil
    const d = normalize({ x: this.pos.x - from.x, y: this.pos.y - from.y });
    this.pos.x = clamp(this.pos.x + d.x * 26, 0, 960);
    this.pos.y = clamp(this.pos.y + d.y * 26, 0, 540);
    this.sprite.setTint(0xc75c4a);
    this.scene.time.delayedCall(120, () => {
      if (this.alive) this.sprite.clearTint();
    });
    this.onHurt(from);
    if (this.hp <= 0) {
      this.alive = false;
      this.deadT = 0;
      this.onDeath();
    }
    return true;
  }

  get dodgeReady(): boolean {
    return this.dodgeCdMs <= 0;
  }

  get dodgeCdRatio(): number {
    return this.dodgeCdMs <= 0 ? 1 : this.dodgeCdMs / PLAYER.dodgeCdMs;
  }
}
