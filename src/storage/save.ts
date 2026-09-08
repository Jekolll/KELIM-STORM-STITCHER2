export interface SaveData {
  v: 1;
  best: number;
  muted: boolean;
  sfxVolume: number;
  reducedFx: boolean;
  tutorialDone: boolean;
}

export const DEFAULT_SAVE: SaveData = {
  v: 1,
  best: 0,
  muted: false,
  sfxVolume: 0.8,
  reducedFx: false,
  tutorialDone: false,
};

const KEY = 'kelim.save.v1';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const num = (v: unknown, fallback: number, lo: number, hi: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === 'boolean' ? v : fallback;

/** Muat save dengan validasi ketat; data korup jatuh ke default. */
export function loadSave(store?: StorageLike): SaveData {
  if (!store) {
    try {
      if (typeof localStorage === 'undefined') return { ...DEFAULT_SAVE };
      store = localStorage;
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      v: 1,
      best: num(p.best, 0, 0, 1_000_000),
      muted: bool(p.muted, DEFAULT_SAVE.muted),
      sfxVolume: num(p.sfxVolume, DEFAULT_SAVE.sfxVolume, 0, 1),
      reducedFx: bool(p.reducedFx, DEFAULT_SAVE.reducedFx),
      tutorialDone: bool(p.tutorialDone, DEFAULT_SAVE.tutorialDone),
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function persistSave(d: SaveData, store?: StorageLike): boolean {
  const target = store ?? (typeof localStorage === 'undefined' ? null : localStorage);
  if (!target) return false;
  try {
    target.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(store?: StorageLike): void {
  const target = store ?? (typeof localStorage === 'undefined' ? null : localStorage);
  if (!target) return;
  try {
    target.removeItem(KEY);
  } catch {
    // abaikan
  }
}
