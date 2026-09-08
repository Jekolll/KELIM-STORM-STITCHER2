import Phaser from 'phaser';
import { type Vec, clamp } from '../utils/geometry';
import { ARENA, STITCH } from '../config/tuning';
import type { Player } from './Player';
import { audio } from '../systems/AudioManager';
import { Effects } from '../systems/EffectsSystem';

export interface EnemyCfg {
  hp: number;
  radius: number;
  score: number;
  /** Tinggi box gambar (1408x768) dalam unit desain. */
  displayImageH: number;
}

/**
 * Basis enemy: sprite master generated + transform animation.
 * Logika state machine tiap enemy di subclass (update).
 */
export abstract class EnemyBase {
  pos: Vec;
  hp: number;
  radius: number;
  score: number;
  alive = true;
  removed = false;
  stunMs = 0;
  onDead: (points: number) => void = () => {};

  protected scene: Phaser.Scene;
  protected fx: Effects;
  protected sprite: Phaser.GameObjects.Image;
  protected shadow: Phaser.GameObjects.Ellipse;
  protected flashMs = 0;
  protected knock: Vec = { x: 0, y: 0 };
  protected baseS: number;
  protected phase: number;

  constructor(
    scene: Phaser.Scene,
    fx: Effects,
    key: string,
    pos: Vec,
    cfg: EnemyCfg,
  ) {
    this.scene = scene;
    this.fx = fx;
    this.pos = { ...pos };
    this.hp = cfg.hp;
    this.radius = cfg.radius;
    this.score = cfg.score;
    this.baseS = cfg.displayImageH / 768;
    this.phase = Math.random() * Math.PI * 2;
    this.sprite = scene.add.image(0, 0, key);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.scale = this.baseS;
    this.sprite.setDepth(Math.floor(pos.y));
    this.shadow = scene.add.ellipse(0, 0, 42, 14, 0x14161d, 0.3);
    this.shadow.setDepth(Math.floor(pos.y) - 1);
  }

  get baseScale(): number {
    return this.baseS;
  }

  protected clampArena(): void {
    this.pos.x = clamp(this.pos.x, ARENA.x + this.radius, ARENA.x + ARENA.w - this.radius);
    this.pos.y = clamp(this.pos.y, ARENA.y + this.radius, ARENA.y + ARENA.h - this.radius);
  }

  /** Return true jika mati akibat hit ini. */
  damage(n: number, from?: Vec): boolean {
    if (!this.alive) return false;
    this.hp -= n;
    this.flashMs = 90;
    this.stunMs = Math.max(this.stunMs, STITCH.stunMs);
    if (from) {
      const d = { x: this.pos.x - from.x, y: this.pos.y - from.y };
      const l = Math.hypot(d.x, d.y) || 1;
      this.knock = { x: (d.x / l) * 60, y: (d.y / l) * 60 };
    }
    this.fx.burst(this.pos.x, this.pos.y - 8, {
      color: 0xf2ebdd,
      count: 6,
      speed: 120,
      life: 260,
      size: 0.7,
      shape: 'fleck',
    });
    audio.play('hit');
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  protected die(): void {
    this.alive = false;
    audio.play('death');
    this.fx.burst(this.pos.x, this.pos.y - 6, {
      color: 0x9b8c7a,
      count: 10,
      speed: 140,
      life: 380,
      size: 0.8,
      shape: 'fleck',
      gravity: 40,
    });
    this.sprite.setDepth(500);
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.baseScale * 1.25,
      alpha: 0,
      rotation: 0.5,
      duration: 240,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.sprite.destroy();
        this.shadow.destroy();
        this.removed = true;
      },
    });
    this.shadow.setAlpha(0);
    this.onDead(this.score);
  }

  abstract update(dt: number, player: Player): void;

  /** Sinkronkan posisi sprite/shadow + tint damage; depth sesuai y. */
  protected syncVisual(): void {
    const d = Math.floor(this.pos.y);
    this.sprite.setDepth(d);
    this.shadow.setDepth(d - 1);
    this.sprite.setPosition(this.pos.x, this.pos.y - 10);
    this.shadow.setPosition(this.pos.x, this.pos.y + 13);
    if (this.flashMs > 0) {
      this.sprite.setTint(0xfff3e2);
    } else {
      this.sprite.clearTint();
    }
  }

  /** Scale visual relatif terhadap base (untuk squash/anticipation). */
  protected setLook(sx: number, sy: number, rot = 0, flipX?: boolean): void {
    this.sprite.setScale(this.baseS * sx, this.baseS * sy);
    this.sprite.setRotation(rot);
    if (flipX !== undefined) this.sprite.setFlipX(flipX);
  }

  /** Timer bersama: flash, stun, knockback, clamp. */
  protected tick(dt: number): void {
    this.flashMs = Math.max(0, this.flashMs - dt * 1000);
    this.stunMs = Math.max(0, this.stunMs - dt * 1000);
    this.phase += dt;
    this.pos.x += this.knock.x * dt;
    this.pos.y += this.knock.y * dt;
    const decay = Math.pow(0.001, dt);
    this.knock.x *= decay;
    this.knock.y *= decay;
    this.clampArena();
  }
}
