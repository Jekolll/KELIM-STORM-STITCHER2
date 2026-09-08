/**
 * Jembatan kecil antara game dan layar "memuat"/panel error di index.html.
 * API di-attach oleh script inline di <head>, jadi fungsi-fungsi di sini aman
 * dipanggil dari mana saja tanpa bergantung pada Phaser. Semua akses opsional —
 * bila overlay tidak ada (mis. test), caller tetap aman.
 */

declare global {
  interface Window {
    __kelimShowLoading?: (msg?: string) => void;
    __kelimSetStatus?: (msg: string) => void;
    __kelimBootDone?: () => void;
    __kelimShowError?: (title: string, detail: string) => void;
    __kelimSetScene?: (name: string) => void;
  }
}

export function setBootStatus(msg: string): void {
  window.__kelimSetStatus?.(msg);
}

/** Umumkan scene aktif ke live region DOM (aksesibilitas + cek deploy eksternal). */
export function setScene(name: string): void {
  window.__kelimSetScene?.(name);
}

export function markBootDone(): void {
  window.__kelimBootDone?.();
}

export function showAssetErrorPanel(title: string, detail: string): void {
  window.__kelimShowError?.(title, detail);
}
