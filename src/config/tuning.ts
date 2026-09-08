import type { Rect } from '../utils/geometry';

/** Design space game: 960x540 unit. */
export const DESIGN_W = 960;
export const DESIGN_H = 540;

/**
 * Area berjalan = lembar kain di tengah arena-ground.png.
 * Diukur dari tekstur arena (kain oat) lalu di-inset agar pemain dan
 * jarum tidak menyentuh lipatan tepi.
 */
export const ARENA: Rect = { x: 104, y: 84, w: 752, h: 388 };

export const PLAYER = {
  speed: 220,
  radius: 12,
  maxHp: 4,
  dodgeMs: 130,
  dodgeSpeed: 560,
  dodgeCdMs: 1100,
  dodgeIframeMs: 80,
  hitInvulnMs: 800,
  /** Tinggi box gambar (1408x768) dalam unit desain; karakter ~58u. */
  displayImageH: 108,
};

export const STITCH = {
  minNeedleDist: 50,
  minArea: 1200,
  damage: 1,
  stunMs: 350,
  multiBonus: 50,
};

export const SERAT = {
  hp: 1,
  speed: 95,
  radius: 13,
  contactRange: 30,
  windupMs: 400,
  recoverMs: 750,
  score: 100,
  displayImageH: 66,
};

export const KUTU = {
  hp: 2,
  speed: 70,
  radius: 15,
  preferredDist: 195,
  chargeRange: 280,
  chargeMinRange: 110,
  windupMs: 500,
  chargeSpeed: 430,
  chargeMs: 300,
  recoverMs: 550,
  score: 150,
  displayImageW: 92,
  /** tinggi box gambar ekuivalen (92 / (1408/768)) — dipakai rig. */
  displayImageH: 50,
};

export const SPAWN = {
  warnMs: 800,
  minPlayerDist: 160,
  minPeerDist: 48,
  maxActive: 6,
};

export const FEEL = {
  hitStopMs: 40,
  shakeUnits: 3,
  shakeMs: 100,
  victoryHpBonus: 150,
};

export const GAME = {
  introMs: 1800,
  endMs: 1500,
  stepMs: 1000 / 60,
  maxFrameMs: 100,
};
