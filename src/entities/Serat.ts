import Phaser from 'phaser';
import type { Vec } from '../utils/geometry';
import { dist, normalize } from '../utils/geometry';
import { SERAT } from '../config/tuning';
import type { Player } from './Player';
import { Effects } from '../systems/EffectsSystem';
import { EnemyBase } from './EnemyBase';

/**
 * Serat Lepas: gumpalan serat kecil yang mendekat.
 * Kontak dekat memicu wind-up 400ms lalu menyerang sekali.
 */
export class Serat extends EnemyBase {
  private state: 'approach' | 'windup' | 'recover' = 'approach';
  private stateMs = 0;

  constructor(scene: Phaser.Scene, fx: Effects, pos: Vec) {
    super(scene, fx, 'serat', pos, {
      hp: SERAT.hp,
      radius: SERAT.radius,
      score: SERAT.score,
      displayImageH: SERAT.displayImageH,
    });
  }

  update(dt: number, player: Player): void {
    if (!this.alive) return;
    this.tick(dt);
    if (this.stunMs > 0 || !player.alive) {
      this.setLook(1, 1);
      this.syncVisual();
      return;
    }
    const d = dist(this.pos, player.pos);
    this.stateMs += dt * 1000;

    switch (this.state) {
      case 'approach': {
        const dir = normalize({
          x: player.pos.x - this.pos.x,
          y: player.pos.y - this.pos.y,
        });
        // wobble lembut agar pergerakan tidak kaku
        const wob = Math.sin(this.phase * 6) * 0.35;
        this.pos.x += (dir.x - dir.y * wob) * SERAT.speed * dt;
        this.pos.y += (dir.y + dir.x * wob) * SERAT.speed * dt;
        this.clampArena();
        const bob = Math.sin(this.phase * 9) * 0.06;
        this.setLook(1 + bob, 1 - bob);
        if (d < SERAT.contactRange) {
          this.state = 'windup';
          this.stateMs = 0;
        }
        break;
      }
      case 'windup': {
        const k = Math.min(1, this.stateMs / SERAT.windupMs);
        this.setLook(1.15, 0.82 - Math.sin(k * Math.PI) * 0.12);
        if (this.stateMs >= SERAT.windupMs) {
          const dNow = dist(this.pos, player.pos);
          if (dNow < SERAT.contactRange + 14) {
            player.takeHit(this.pos);
          }
          this.state = 'recover';
          this.stateMs = 0;
        }
        break;
      }
      case 'recover': {
        const k = Math.min(1, this.stateMs / SERAT.recoverMs);
        this.setLook(1 - 0.1 * (1 - k), 1 + 0.1 * (1 - k));
        if (this.stateMs >= SERAT.recoverMs) {
          this.state = 'approach';
          this.stateMs = 0;
        }
        break;
      }
    }
    this.syncVisual();
  }
}
