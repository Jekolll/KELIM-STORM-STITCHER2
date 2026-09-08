import { describe, it, expect } from 'vitest';
import { BASE_STITCH, MODIFIERS } from '../../src/data/modifiers';
import { mulberry32, pickN } from '../../src/utils/rng';

describe('modifiers', () => {
  it('setiap modifier mengubah stats yang dijanjikan', () => {
    const s1 = { ...BASE_STITCH };
    MODIFIERS.find((m) => m.id === 'quick-pull')!.apply(s1);
    expect(s1.anticipationMs).toBeLessThan(BASE_STITCH.anticipationMs);
    expect(s1.cooldownMs).toBeLessThan(BASE_STITCH.cooldownMs);

    const s2 = { ...BASE_STITCH };
    MODIFIERS.find((m) => m.id === 'long-needles')!.apply(s2);
    expect(s2.maxPlacementDist).toBeGreaterThan(BASE_STITCH.maxPlacementDist);

    const s3 = { ...BASE_STITCH };
    MODIFIERS.find((m) => m.id === 'wide-stitch')!.apply(s3);
    expect(s3.maxSide).toBeGreaterThan(BASE_STITCH.maxSide);
    expect(s3.cooldownMs).toBeGreaterThan(BASE_STITCH.cooldownMs);
  });

  it('modifier tidak memodifikasi BASE_STITCH', () => {
    const before = { ...BASE_STITCH };
    MODIFIERS.forEach((m) => m.apply({ ...BASE_STITCH }));
    expect(BASE_STITCH).toEqual(before);
  });

  it('pickN memberi n modifier unik (deterministik per seed)', () => {
    const rng = mulberry32(42);
    const picks = pickN(MODIFIERS, 2, rng);
    expect(picks).toHaveLength(2);
    expect(new Set(picks.map((p) => p.id)).size).toBe(2);
    const rng2 = mulberry32(42);
    const picks2 = pickN(MODIFIERS, 2, rng2);
    expect(picks2.map((p) => p.id)).toEqual(picks.map((p) => p.id));
  });
});
