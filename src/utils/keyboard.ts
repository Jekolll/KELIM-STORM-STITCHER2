import Phaser from 'phaser';

/** Peta nama key → objek Key Phaser. */
export type KeyMap = Record<string, Phaser.Input.Keyboard.Key>;

/**
 * JEBAKAN PHASER (penyebab "halaman blank" di v0.1).
 *
 * `KeyboardPlugin.addKeys()` TIDAK menerima array. Implementasinya memakai
 * `for (var key in keys)`, sehingga `addKeys(['UP','DOWN'])` menghasilkan
 * `{ '0': Key, '1': Key }` — lookup by-name jadi `undefined`, dan
 * `k.UP.on('keydown', …)` melempar
 * `TypeError: Cannot read properties of undefined (reading 'on')` yang
 * membunuh scene tepat di `create()`.
 *
 * Signature TypeScript-nya `addKeys(keys: object | string)`, dan array JUGA
 * `object`, jadi tsc tidak pernah protes — hanya bisa ditangkap lewat runtime
 * atau test di file `tests/unit/keyboard.test.ts`.
 *
 * Helper ini selalu mengirim peta `{ NAMA: 'NAMA' }` dan membuang entri yang
 * tidak tersedia, jadi scene tidak bisa crash hanya karena satu nama key.
 */
export function bindKeys(
  kb: Phaser.Input.Keyboard.KeyboardPlugin | null | undefined,
  names: readonly string[],
): KeyMap {
  const map: KeyMap = {};
  if (!kb) return map;

  const spec: Record<string, string> = {};
  for (const name of names) spec[name] = name;

  const raw = kb.addKeys(spec) as unknown as Record<
    string,
    Phaser.Input.Keyboard.Key | undefined
  >;
  for (const name of names) {
    const key = raw[name];
    if (key) map[name] = key;
  }
  return map;
}

/** Pasang listener keydown; no-op kalau key-nya tidak ada. */
export function onKeyDown(
  map: KeyMap | null | undefined,
  name: string,
  cb: () => void,
): void {
  map?.[name]?.on('keydown', cb);
}

/** Ada tidaknya salah satu key ini sedang ditekan (aman untuk peta kosong). */
export function isDown(map: KeyMap | null | undefined, ...names: string[]): boolean {
  if (!map) return false;
  for (const name of names) {
    if (map[name]?.isDown) return true;
  }
  return false;
}
