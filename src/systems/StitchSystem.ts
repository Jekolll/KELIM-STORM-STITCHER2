import { type Vec, type Rect, dist, inRect, maxSide, triArea } from '../utils/geometry';
import type { StitchStats } from '../data/modifiers';

export type StitchPhase = 'open' | 'closing' | 'cooldown';

export type PlacementReason =
  | 'phase'
  | 'cooldown'
  | 'out-of-arena'
  | 'too-far'
  | 'too-close'
  | 'side-too-long'
  | 'area-too-small';

export interface PlacementCheck {
  ok: boolean;
  reason?: PlacementReason;
}

export interface StitchRules {
  arena: Rect;
  minNeedleDist: number;
  minArea: number;
}

export interface StitchEvents {
  onNeedle?: (p: Vec, count: number) => void;
  onClear?: () => void;
  onClosed?: () => void;
  onResolve?: (tri: Vec[]) => void;
}

/**
 * Mesin state jahitan murni (tanpa Phaser) agar dapat diuji headless.
 * Urutan: open (0..2 jarum) -> closing (anticipation) -> cooldown -> open.
 */
export class StitchSystem {
  phase: StitchPhase = 'open';
  needles: Vec[] = [];
  stats: StitchStats;
  private phaseTime = 0;
  private rules: StitchRules;
  private events: StitchEvents;

  constructor(stats: StitchStats, rules: StitchRules, events: StitchEvents = {}) {
    this.stats = { ...stats };
    this.rules = rules;
    this.events = events;
  }

  canPlace(): boolean {
    return this.phase === 'open';
  }

  /** Sisa cooldown (0 jika tidak dalam cooldown). */
  cooldownRemaining(): number {
    if (this.phase !== 'cooldown') return 0;
    return Math.max(0, this.stats.cooldownMs - this.phaseTime);
  }

  checkPlacement(p: Vec, playerPos: Vec): PlacementCheck {
    if (this.phase === 'closing') return { ok: false, reason: 'phase' };
    if (this.phase === 'cooldown') return { ok: false, reason: 'cooldown' };
    if (this.needles.length >= 3) return { ok: false, reason: 'cooldown' };
    if (!inRect(p, this.rules.arena, 4)) return { ok: false, reason: 'out-of-arena' };
    if (dist(p, playerPos) > this.stats.maxPlacementDist) return { ok: false, reason: 'too-far' };
    for (const n of this.needles) {
      if (dist(p, n) < this.rules.minNeedleDist) return { ok: false, reason: 'too-close' };
    }
    const pts = [...this.needles, p];
    if (pts.length === 2) {
      if (dist(pts[0], pts[1]) > this.stats.maxSide) {
        return { ok: false, reason: 'side-too-long' };
      }
    }
    if (pts.length === 3) {
      if (maxSide(pts[0], pts[1], pts[2]) > this.stats.maxSide) {
        return { ok: false, reason: 'side-too-long' };
      }
      if (triArea(pts[0], pts[1], pts[2]) < this.rules.minArea) {
        return { ok: false, reason: 'area-too-small' };
      }
    }
    return { ok: true };
  }

  place(p: Vec, playerPos: Vec): boolean {
    if (!this.checkPlacement(p, playerPos).ok) return false;
    this.needles.push({ x: p.x, y: p.y });
    this.events.onNeedle?.(this.needles[this.needles.length - 1], this.needles.length);
    if (this.needles.length === 3) {
      this.phase = 'closing';
      this.phaseTime = 0;
      this.events.onClosed?.();
    }
    return true;
  }

  cancel(): boolean {
    if (this.phase === 'open' && this.needles.length > 0) {
      this.needles = [];
      this.events.onClear?.();
      return true;
    }
    return false;
  }

  /** Majukan waktu; mengembalikan 'resolved' tepat saat jahitan resolve. */
  update(dtMs: number): 'resolved' | null {
    if (this.phase === 'closing') {
      this.phaseTime += dtMs;
      if (this.phaseTime >= this.stats.anticipationMs) {
        const tri = [...this.needles];
        this.needles = [];
        this.phase = 'cooldown';
        this.phaseTime = 0;
        this.events.onResolve?.(tri);
        return 'resolved';
      }
      return null;
    }
    if (this.phase === 'cooldown') {
      this.phaseTime += dtMs;
      if (this.phaseTime >= this.stats.cooldownMs) {
        this.phase = 'open';
        this.phaseTime = 0;
      }
    }
    return null;
  }

  reset(): void {
    this.needles = [];
    this.phase = 'open';
    this.phaseTime = 0;
    this.events.onClear?.();
  }
}
