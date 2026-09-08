import Phaser from 'phaser';
import type { Vec } from '../utils/geometry';
import { dist, normalize } from '../utils/geometry';
import { ARENA, KUTU } from '../config/tuning';
import type { Player } from './Player';
import { Effects } from '../systems/EffectsSystem';
import { EnemyBase } from './EnemyBase';

/**
 * Kutu Sobek: menjaga jarak, lalu charge lurus dengan telegraph 500ms.
 * Hanya berbahaya saat charge — counterplay: bait lalu jahit saat recovery.
 */
export class Kutu extends EnemyBase {
  private state: 'patrol' | 'windup' | 'charge' | 'recover' = 'patrol';
  private stateMs = 0;
  private chargeDir: Vec = { x: 1, y: 0 };
  private orbitSign = 1;
  private orbitFlipIn = 2 + Math.random() * 2;
  private hitThisCharge = false;
  private chargeCooldownMs = 0;

  constructor(scene: Phaser.Scene, fx: Effects, pos: Vec) {
    super(scene, fx, 'kutu', pos, {
      hp: KUTU.hp,
      radius: KUTU.radius,
      score: KUTU.score,
      displayImageH: KUTU.displayImageH,
    });
  }

  update(dt: number, player: Player): void {
    if (!this.alive) return;
    this.tick(dt);
    if (this.stunMs > 0) {
      this.setLook(1, 1);
      this.syncVisual();
      return;
    }
    if (!player.alive) {
      this.setLook(1, 1);
      this.syncVisual();
      return;
    }
    this.stateMs += dt * 1000;
    this.chargeCooldownMs = Math.max(0, this.chargeCooldownMs - dt * 1000);
    const d = dist(this.pos, player.pos);
    const face = this.pos.x > player.pos.x;

    switch (this.state) {
      case 'patrol': {
        const toPlayer = normalize({ x: player.pos.x - this.pos.x, y: player.pos.y - this.pos.y });
        this.orbitFlipIn -= dt;
        if (this.orbitFlipIn <= 0) {
          this.orbitFlipIn = 1.6 + Math.random() * 2.4;
          this.orbitSign *= -1;
        }
        const radial = d > KUTU.preferredDist + 30 ? 1 : d < KUTU.preferredDist - 30 ? -1 : 0;
        const dir = {
          x: toPlayer.x * radial + -toPlayer.y * this.orbitSign * (radial === 0 ? 1 : 0.35),
          y: toPlayer.y * radial + toPlayer.x * this.orbitSign * (radial === 0 ? 1 : 0.35),
        };
        const n = normalize(dir);
        const hover = Math.sin(this.phase * 5) * 0.05;
        this.pos.x += n.x * KUTU.speed * dt;
        this.pos.y += n.y * KUTU.speed * dt;
        this.clampArena();
        this.setLook(1, 1 + hover, 0, face);
        if (
          this.chargeCooldownMs <= 0 &&
          d < KUTU.chargeRange &&
          d > KUTU.chargeMinRange
        ) {
          this.state = 'windup';
          this.stateMs = 0;
          this.chargeDir = { x: toPlayer.x, y: toPlayer.y };
        }
        break;
      }
      case 'windup': {
        const tremble = Math.sin(this.stateMs * 0.09) * 0.04;
        this.setLook(1.22, 0.72, tremble, face);
        if (this.stateMs >= KUTU.windupMs) {
          this.state = 'charge';
          this.stateMs = 0;
          this.hitThisCharge = false;
        }
        break;
      }
      case 'charge': {
        this.pos.x += this.chargeDir.x * KUTU.chargeSpeed * dt;
        this.pos.y += this.chargeDir.y * KUTU.chargeSpeed * dt;
        this.setLook(1.3, 0.68, 0, face);
        if (!this.hitThisCharge && dist(this.pos, player.pos) < this.radius + player.radius + 6) {
          this.hitThisCharge = true;
          player.takeHit(this.pos);
        }
        const hitWall =
          this.pos.x <= ARENA.x + this.radius ||
          this.pos.x >= ARENA.x + ARENA.w - this.radius ||
          this.pos.y <= ARENA.y + this.radius ||
          this.pos.y >= ARENA.y + ARENA.h - this.radius;
        if (this.stateMs >= KUTU.chargeMs || hitWall) {
          this.state = 'recover';
          this.stateMs = 0;
          this.chargeCooldownMs = 900;
          this.clampArena();
        }
        break;
      }
      case 'recover': {
        const k = Math.min(1, this.stateMs / KUTU.recoverMs);
        this.setLook(1 + 0.15 * (1 - k), 0.9, 0, face);
        if (this.stateMs >= KUTU.recoverMs) {
          this.state = 'patrol';
          this.stateMs = 0;
        }
        break;
      }
    }
    this.syncVisual();
  }
}
