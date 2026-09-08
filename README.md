# KELIM: Storm Stitcher

Game 2D tactical action single-player untuk browser. Kamu adalah **Penjahit**, penjaga bengkel kain kecil yang melawan makhluk badai — bukan dengan senjata, tapi dengan **menjahit ruang**: tempatkan tiga jarum membentuk segitiga, benang menegang, dan semua makhluk di dalamnya tertangkap.

> Status: **vertical slice v0.1** (2 encounter, 2 jenis musuh, 3 modifier, menu/pause/results, desktop + touch landscape).

## Menjalankan

```bash
npm install
npm run dev        # development (http://localhost:5173)
npm run test       # unit test (Vitest, headless)
npm run build      # typecheck + production build ke dist/
npm run preview    # serve production build
```

Tanpa CDN di runtime: seluruh aset (gambar, font, audio prosedural) lokal.

## Kontrol

| Input | Aksi |
|---|---|
| WASD / Panah | Gerak |
| Spasi | Segir (hindar singkat, i-frame awal) |
| Klik Kiri | Tempatkan jarum (3 jarum menutup jahitan) |
| Klik Kanan / Q | Batalkan pola |
| Esc | Jeda |
| Touch (landscape) | Stick kiri · ketuk arena = jarum · tombol kanan (segir/batal) |

## Aturan inti

- Jahitan memukul semua musuh di dalam segitiga (termasuk yang bersinggungan dengan sisi).
- 1 target per jahitan kena 1 damage; multi-catch memberi bonus skor + hit-stop.
- Batas jahitan: jarak penempatan dari pemain, sisi maksimum, luas minimum.
- Enemy hanya berbahaya setelah telegraph selesai; spawn diberi warning di tepi arena.

## Struktur

```
src/
  config/        tuning gameplay + manifest aset + palet
  data/          modifier, encounter script
  entities/      Player, Serat, Kutu (rig transform)
  systems/       StitchSystem (pure), EncounterDirector (pure),
                 AudioManager (WebAudio synth), EffectsSystem (VFX)
  scenes/        Boot, Menu, Game, Results
  ui/            Hud, TouchControls, helpers (tombol gaya label-kain)
  storage/       save lokal dengan validasi
  utils/         geometry (pure), rng (seeded), pointer, keyboard (peta key aman),
                 bootBridge (jembatan ke overlay "memuat"/panel error)
public/assets/   PNG hasil generate + cutout (runtime)
art-source/      master gambar asli + referensi
scripts/         cutout.mjs (flood-fill alpha + defringe)
tests/unit/      Vitest: geometry, stitch, director, modifier, save
```

## Catatan produksi

- Aset karakter/musuh di-generate lalu diproses `scripts/cutout.mjs`
  (fixed-reference flood + defringe 1px). Master asli disimpan di `art-source/`.
- Audio 100% disintesis prosedural (WebAudio) — tidak ada file audio.
- Font: Fraunces + Source Sans 3 (@fontsource, di-bundle lokal).

## Jaring pengaman boot + jebakan yang perlu diketahui

Halaman ini sempat **blank total** di produksi, jadi boot sekarang selalu bicara:

- `#boot` — layar "memuat" (logo + spinner + persen progres) tampil begitu HTML dibaca,
  ditutup oleh `BootScene` saat sukses.
- `#error` — panel error yang menampilkan pesan + stack bila modul / WebGL / runtime /
  aset gagal (handler `error` + `unhandledrejection` dipasang sebagai *script klasik* di
  `<head>`, jadi error sebelum modul dimuat pun tertangkap). Ada tombol "Muat ulang".
- `#scene-status` — live region (`role="status" aria-live="polite"`, *visually hidden*)
  yang mengumumkan scene aktif: `KELIM siap — scene aktif: Menu`. Berguna untuk
  screen reader **dan** untuk memverifikasi deploy dari luar tanpa devtools.

**Jebakan Phaser:** `KeyboardPlugin.addKeys()` tidak menerima array. Implementasinya
beriterasi dengan `for (var key in keys)`, sehingga `addKeys(['UP','DOWN'])` menghasilkan
`{ '0': Key, '1': Key }` — lookup by-name jadi `undefined` dan `k.UP.on(...)` melempar
`TypeError` yang membunuh scene tepat di `create()`. Tipe `addKeys(keys: object | string)`
lolos-tsc untuk array, jadi bug ini hanya terlihat di runtime.

Selalu pakai `bindKeys()` / `onKeyDown()` / `isDown()` dari `src/utils/keyboard.ts`.
`tests/unit/keyboard.test.ts` menjaga ini lewat guard statis yang menolak pemanggilan
`.addKeys([` di seluruh `src/` (dijalankan CI di setiap PR/push ke `main`).

## Deploy

Vercel men-deploy `main` (produksi: `mergedgame`). `npm run build` = `tsc --noEmit && vite build`;
Phaser dipisah ke chunk sendiri (`manualChunks`) agar kode game berukuran kecil bisa jalan cepat
dan Phaser ter-cache antar rilis. Status deploy terlihat sebagai commit status `Vercel – mergedgame`
di GitHub.
