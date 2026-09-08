import Phaser from 'phaser';

/**
 * Deteksi jenis pointer. Phaser 3.90 tidak mengekspos pointerType di
 * Pointer, jadi cek event native-nya; fallback: id mouse = 0,
 * touch/pen mendapat id > 0.
 */
export function pointerIsTouch(p: Phaser.Input.Pointer): boolean {
  const ev = p.event as (PointerEvent & { pointerType?: string }) | null;
  if (ev && 'pointerType' in ev) {
    const t = (ev as PointerEvent & { pointerType?: string }).pointerType;
    if (t) return t === 'touch' || t === 'pen';
  }
  return p.id > 0;
}
