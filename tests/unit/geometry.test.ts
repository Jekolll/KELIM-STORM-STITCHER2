import { describe, it, expect } from 'vitest';
import {
  dist,
  triArea,
  pointInTri,
  distPointSeg,
  circleHitsTri,
  maxSide,
  inRect,
} from '../../src/utils/geometry';

const A = { x: 0, y: 0 };
const B = { x: 100, y: 0 };
const C = { x: 0, y: 100 };

describe('geometry', () => {
  it('triArea menghitung luas benar', () => {
    expect(triArea(A, B, C)).toBeCloseTo(5000);
    // degenerate
    expect(triArea(A, B, { x: 50, y: 0 })).toBeCloseTo(0);
  });

  it('pointInTri: di dalam, di luar, dan tepat di tepi', () => {
    expect(pointInTri({ x: 20, y: 20 }, A, B, C)).toBe(true);
    expect(pointInTri({ x: 200, y: 20 }, A, B, C)).toBe(false);
    expect(pointInTri({ x: 50, y: 0 }, A, B, C)).toBe(true); // tepat di sisi AB
    expect(pointInTri({ x: 50, y: -5 }, A, B, C)).toBe(false);
  });

  it('distPointSeg menangani endpoint dan proyeksi di tengah', () => {
    expect(distPointSeg({ x: 50, y: 10 }, A, B)).toBeCloseTo(10);
    expect(distPointSeg({ x: -10, y: 0 }, A, B)).toBeCloseTo(10); // proyek ke A
    expect(distPointSeg({ x: 110, y: 0 }, A, B)).toBeCloseTo(10); // proyek ke B
  });

  it('circleHitsTri: pusat di dalam', () => {
    expect(circleHitsTri({ x: 20, y: 20 }, 10, A, B, C)).toBe(true);
  });

  it('circleHitsTri: lingkaran menyentuh sisi', () => {
    // pusat tepat di luar sisi AB, radius = jarak ke sisi
    expect(circleHitsTri({ x: 50, y: -8 }, 8, A, B, C)).toBe(true);
    expect(circleHitsTri({ x: 50, y: -9 }, 8, A, B, C)).toBe(false);
  });

  it('circleHitsTri: sudut segitiga memotong lingkaran', () => {
    // sudut B di (100,0); pusat (110,10) berjarak 14.14 dari B
    expect(circleHitsTri({ x: 110, y: 10 }, 15, A, B, C)).toBe(true);
    expect(circleHitsTri({ x: 110, y: 10 }, 14, A, B, C)).toBe(false);
    expect(circleHitsTri({ x: 130, y: 30 }, 14, A, B, C)).toBe(false);
  });

  it('maxSide dan inRect', () => {
    expect(maxSide(A, B, C)).toBeCloseTo(141.42, 2);
    expect(inRect({ x: 50, y: 50 }, { x: 0, y: 0, w: 100, h: 100 })).toBe(true);
    expect(inRect({ x: 100, y: 50 }, { x: 0, y: 0, w: 100, h: 100 }, 1)).toBe(false);
    expect(dist(A, B)).toBe(100);
  });
});
