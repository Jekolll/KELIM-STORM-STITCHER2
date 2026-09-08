import type { WaveDef, EnemyType } from '../data/encounters';
import { type Vec, type Rect, dist, lerp } from '../utils/geometry';
import { SPAWN } from '../config/tuning';

/**
 * Director encounter murni: memutar spawn scripted berdasarkan waktu.
 * Tidak menyentuh Phaser agar bisa diuji headless.
 */
export class EncounterDirector {
  private t = 0;
  private spawned = 0;
  active = 0;
  running = false;

  constructor(private wave: WaveDef) {}

  start(): void {
    this.t = 0;
    this.spawned = 0;
    this.running = true;
  }

  setAlive(n: number): void {
    this.active = n;
  }

  /** Return tipe enemy yang perlu di-spawn pada step ini. */
  update(dtMs: number): EnemyType[] {
    if (!this.running) return [];
    this.t += dtMs;
    const out: EnemyType[] = [];
    while (
      this.spawned < this.wave.spawns.length &&
      this.wave.spawns[this.spawned].atMs <= this.t
    ) {
      out.push(this.wave.spawns[this.spawned++].type);
    }
    return out;
  }

  get pendingCount(): number {
    return this.wave.spawns.length - this.spawned;
  }

  get isClear(): boolean {
    return this.pendingCount === 0 && this.active === 0;
  }

  /** Progres 0..1: spawn selesai + musuh tersingkir. */
  get progress(): number {
    const total = this.wave.spawns.length;
    if (total === 0) return 1;
    const spawnedFrac = this.spawned / total;
    const killedFrac = 1 - this.active / Math.max(1, total);
    return Math.min(1, (spawnedFrac + killedFrac) / 2);
  }
}

/**
 * Pilih titik spawn di tepi arena: minimal minPlayerDist dari pemain
 * dan minPeerDist dari enemy aktif. Fallback: titik terjauh yang valid
 * terhadap pemain.
 */
export function pickSpawnPoint(
  arena: Rect,
  player: Vec,
  occupied: Vec[],
  rng: () => number,
): Vec {
  let fallback: Vec | null = null;
  let fallbackDist = -1;

  for (let i = 0; i < 48; i++) {
    const side = Math.floor(rng() * 4);
    let p: Vec;
    switch (side) {
      case 0:
        p = { x: lerp(arena.x + 8, arena.x + arena.w - 8, rng()), y: arena.y + 10 };
        break;
      case 1:
        p = { x: lerp(arena.x + 8, arena.x + arena.w - 8, rng()), y: arena.y + arena.h - 10 };
        break;
      case 2:
        p = { x: arena.x + 10, y: lerp(arena.y + 8, arena.y + arena.h - 8, rng()) };
        break;
      default:
        p = { x: arena.x + arena.w - 10, y: lerp(arena.y + 8, arena.y + arena.h - 8, rng()) };
        break;
    }
    const dp = dist(p, player);
    if (dp > fallbackDist) {
      fallbackDist = dp;
      fallback = p;
    }
    if (dp < SPAWN.minPlayerDist) continue;
    if (occupied.some((o) => dist(p, o) < SPAWN.minPeerDist)) continue;
    return p;
  }
  return fallback ?? { x: arena.x + 20, y: arena.y + 20 };
}
