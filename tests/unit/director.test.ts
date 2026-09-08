import { describe, it, expect } from 'vitest';
import {
  EncounterDirector,
  pickSpawnPoint,
} from '../../src/systems/EncounterDirector';
import { ENCOUNTERS } from '../../src/data/encounters';
import { ARENA, SPAWN } from '../../src/config/tuning';
import { dist } from '../../src/utils/geometry';
import { mulberry32 } from '../../src/utils/rng';

describe('EncounterDirector', () => {
  it('memutar spawn sesuai jadwal waktu', () => {
    const d = new EncounterDirector(ENCOUNTERS[0]);
    d.start();
    expect(d.update(1000)).toEqual([]); // t=1000
    expect(d.update(599)).toEqual([]); // t=1599
    expect(d.update(1)).toEqual(['serat']); // t=1600
    expect(d.update(999)).toEqual([]); // t=2599
    expect(d.update(1)).toEqual(['serat']); // t=2600
    expect(d.update(6899)).toEqual([]); // t=9499
    expect(d.update(1)).toEqual(['serat']); // t=9500
    expect(d.update(999)).toEqual([]); // t=10499
    expect(d.update(1)).toEqual(['serat']); // t=10500
    expect(d.pendingCount).toBe(0);
  });

  it('isClear hanya saat semua spawn selesai dan semua mati', () => {
    const d = new EncounterDirector(ENCOUNTERS[0]);
    d.start();
    d.update(20000);
    d.setAlive(2);
    expect(d.isClear).toBe(false);
    d.setAlive(0);
    expect(d.isClear).toBe(true);
  });
});

describe('pickSpawnPoint', () => {
  const player = { x: 480, y: 300 };

  it('menghormati jarak minimum dari pemain', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 25; i++) {
      const p = pickSpawnPoint(ARENA, player, [], rng);
      expect(dist(p, player)).toBeGreaterThanOrEqual(SPAWN.minPlayerDist);
    }
  });

  it('menghindari titik yang sudah diduduki enemy', () => {
    const occupied = [
      { x: ARENA.x + 10, y: ARENA.y + 10 },
      { x: ARENA.x + ARENA.w - 10, y: ARENA.y + 10 },
      { x: ARENA.x + 10, y: ARENA.y + ARENA.h - 10 },
      { x: ARENA.x + ARENA.w - 10, y: ARENA.y + ARENA.h - 10 },
    ];
    const rng = mulberry32(3);
    for (let i = 0; i < 12; i++) {
      const p = pickSpawnPoint(ARENA, player, occupied, rng);
      for (const o of occupied) {
        expect(dist(p, o)).toBeGreaterThanOrEqual(SPAWN.minPeerDist);
      }
    }
  });

  it('hasil selalu berada di dalam arena', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 30; i++) {
      const p = pickSpawnPoint(ARENA, player, [], rng);
      expect(p.x).toBeGreaterThanOrEqual(ARENA.x);
      expect(p.x).toBeLessThanOrEqual(ARENA.x + ARENA.w);
      expect(p.y).toBeGreaterThanOrEqual(ARENA.y);
      expect(p.y).toBeLessThanOrEqual(ARENA.y + ARENA.h);
    }
  });
});
