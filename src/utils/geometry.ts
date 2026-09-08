export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function inRect(p: Vec, r: Rect, pad = 0): boolean {
  return (
    p.x >= r.x + pad &&
    p.x <= r.x + r.w - pad &&
    p.y >= r.y + pad &&
    p.y <= r.y + r.h - pad
  );
}

export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Luas segitiga (selalu non-negatif). */
export function triArea(a: Vec, b: Vec, c: Vec): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

/** Point-in-triangle termasuk batas (edge-inclusive). */
export function pointInTri(p: Vec, a: Vec, b: Vec, c: Vec): boolean {
  const s = (p1: Vec, p2: Vec): number =>
    (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x);
  const d1 = s(a, b);
  const d2 = s(b, c);
  const d3 = s(c, a);
  const hasNeg = d1 < -1e-9 || d2 < -1e-9 || d3 < -1e-9;
  const hasPos = d1 > 1e-9 || d2 > 1e-9 || d3 > 1e-9;
  return !(hasNeg && hasPos);
}

/** Jarak titik ke segmen a-b. */
export function distPointSeg(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

/**
 * Apakah lingkaran (pusat c, radius r) berpotongan dengan segitiga abc.
 * Termasuk: pusat di dalam, atau sisi lingkaran menyentuh sisi segitiga.
 * Aturan ini juga divisualisasikan oleh rendering preview, jadi tampilan
 * dan damage selalu memakai data geometri yang sama.
 */
export function circleHitsTri(
  c: Vec,
  r: number,
  a: Vec,
  b: Vec,
  d: Vec,
): boolean {
  if (pointInTri(c, a, b, d)) return true;
  return (
    distPointSeg(c, a, b) <= r ||
    distPointSeg(c, b, d) <= r ||
    distPointSeg(c, d, a) <= r
  );
}

export function maxSide(a: Vec, b: Vec, c: Vec): number {
  return Math.max(dist(a, b), dist(b, c), dist(c, a));
}

export function normalize(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}
