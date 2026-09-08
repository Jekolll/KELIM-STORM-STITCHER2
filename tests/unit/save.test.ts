import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SAVE,
  loadSave,
  persistSave,
  type SaveData,
} from '../../src/storage/save';

function memStore(): { map: Map<string, string>; getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('save', () => {
  let store: ReturnType<typeof memStore>;
  beforeEach(() => {
    store = memStore();
  });

  it('store kosong menghasilkan default', () => {
    const d = loadSave(store);
    expect(d).toEqual(DEFAULT_SAVE);
  });

  it('data korup jatuh ke default (tidak melempar)', () => {
    store.setItem('kelim.save.v1', '{bukan-json!!');
    const d = loadSave(store);
    expect(d).toEqual(DEFAULT_SAVE);
  });

  it('nilai di luar rentang di-clamp, tipe salah diabaikan', () => {
    store.setItem(
      'kelim.save.v1',
      JSON.stringify({ best: -5, sfxVolume: 9, muted: 'yes', reducedFx: true }),
    );
    const d = loadSave(store);
    expect(d.best).toBe(0);
    expect(d.sfxVolume).toBe(1);
    expect(d.muted).toBe(false);
    expect(d.reducedFx).toBe(true);
  });

  it('round-trip persist', () => {
    const d: SaveData = { ...DEFAULT_SAVE, best: 12345, muted: true };
    expect(persistSave(d, store)).toBe(true);
    expect(loadSave(store)).toEqual(d);
  });
});
