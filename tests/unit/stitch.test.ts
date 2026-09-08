import { describe, it, expect, vi } from 'vitest';
import { StitchSystem } from '../../src/systems/StitchSystem';
import { BASE_STITCH } from '../../src/data/modifiers';
import { ARENA, STITCH } from '../../src/config/tuning';

const playerPos = { x: 480, y: 300 };
const rules = { arena: ARENA, minNeedleDist: STITCH.minNeedleDist, minArea: STITCH.minArea };

function make() {
  const onResolve = vi.fn();
  const onNeedle = vi.fn();
  const sys = new StitchSystem({ ...BASE_STITCH }, rules, { onResolve, onNeedle });
  return { sys, onResolve, onNeedle };
}

describe('StitchSystem', () => {
  it('tiga jarum valid memicu closing lalu resolve tepat setelah anticipation', () => {
    const { sys, onResolve } = make();
    const n1 = { x: 420, y: 260 };
    const n2 = { x: 540, y: 260 };
    const n3 = { x: 480, y: 200 };
    expect(sys.place(n1, playerPos)).toBe(true);
    expect(sys.place(n2, playerPos)).toBe(true);
    expect(sys.place(n3, playerPos)).toBe(true);
    expect(sys.phase).toBe('closing');
    // belum resolve
    expect(sys.update(139)).toBeNull();
    expect(onResolve).not.toHaveBeenCalled();
    expect(sys.update(2)).toBe('resolved');
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve.mock.calls[0][0]).toHaveLength(3);
    expect(sys.phase).toBe('cooldown');
  });

  it('cooldown memblokir placement sampai habis', () => {
    const { sys } = make();
    sys.place({ x: 420, y: 260 }, playerPos);
    sys.place({ x: 540, y: 260 }, playerPos);
    sys.place({ x: 480, y: 200 }, playerPos);
    sys.update(BASE_STITCH.anticipationMs + 1); // resolve
    expect(sys.canPlace()).toBe(false);
    expect(sys.checkPlacement({ x: 400, y: 240 }, playerPos).ok).toBe(false);
    sys.update(BASE_STITCH.cooldownMs);
    expect(sys.canPlace()).toBe(true);
    expect(sys.checkPlacement({ x: 400, y: 240 }, playerPos).ok).toBe(true);
  });

  it('placement di luar arena ditolak', () => {
    const { sys } = make();
    expect(sys.checkPlacement({ x: 50, y: 50 }, playerPos).reason).toBe('out-of-arena');
  });

  it('placement terlalu jauh dari pemain ditolak', () => {
    const { sys } = make();
    expect(sys.checkPlacement({ x: 760, y: 300 }, playerPos).reason).toBe('too-far');
  });

  it('jarum terlalu dekat dengan jarum lain ditolak', () => {
    const { sys } = make();
    sys.place({ x: 420, y: 260 }, playerPos);
    expect(sys.checkPlacement({ x: 430, y: 262 }, playerPos).reason).toBe('too-close');
  });

  it('sisi lebih dari maxSide ditolak', () => {
    const { sys } = make();
    // dua jarum masing-masing ≤220 dari pemain, tetapi sisinya 440 > 320
    const p1 = { x: 700, y: 300 }; // 220 dari pemain
    const p2 = { x: 260, y: 300 }; // 220 dari pemain
    expect(sys.checkPlacement(p1, playerPos).ok).toBe(true);
    sys.place(p1, playerPos);
    const check = sys.checkPlacement(p2, playerPos);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('side-too-long');
  });

  it('area terlalu kecil (segitiga tipis) ditolak', () => {
    const { sys } = make();
    const a = { x: 400, y: 300 };
    const b = { x: 500, y: 300 };
    sys.place(a, playerPos);
    sys.place(b, playerPos);
    const c = { x: 450, y: 305 }; // tinggi 5 → luas 250 < 1200
    const check = sys.checkPlacement(c, playerPos);
    expect(check.ok).toBe(false);
    expect(check.reason).toBe('area-too-small');
  });

  it('cancel mengosongkan jarum tanpa penalti', () => {
    const { sys, onNeedle } = make();
    sys.place({ x: 420, y: 260 }, playerPos);
    sys.place({ x: 540, y: 260 }, playerPos);
    expect(sys.cancel()).toBe(true);
    expect(sys.needles).toHaveLength(0);
    expect(sys.phase).toBe('open');
    expect(onNeedle).toHaveBeenCalledTimes(2);
  });

  it('input invalid tidak menghabiskan state', () => {
    const { sys } = make();
    expect(sys.place({ x: 50, y: 50 }, playerPos)).toBe(false);
    expect(sys.place({ x: 760, y: 300 }, playerPos)).toBe(false);
    expect(sys.needles).toHaveLength(0);
    expect(sys.phase).toBe('open');
  });
});
