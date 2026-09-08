/** Manifest aset runtime. Semua file lokal (public/), tanpa CDN. */
export interface AssetDef {
  key: string;
  url: string;
}

// BASE_URL membuat loader tetap benar saat game dibuka di root maupun subpath
// (misalnya deployment GitHub Pages). Tanpa ini, URL relatif dapat dihitung
// terhadap URL route saat ini, bukan terhadap root asset Vite.
const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}assets/${path}`;

export const ASSETS: AssetDef[] = [
  { key: 'arena', url: assetUrl('environments/arena-ground.png') },
  { key: 'tailor', url: assetUrl('characters/tailor.png') },
  { key: 'serat', url: assetUrl('enemies/serat.png') },
  { key: 'kutu', url: assetUrl('enemies/kutu.png') },
];

/** Palet inti KELIM (hex angka untuk Phaser, string untuk teks). */
export const C = {
  ink: 0x252832,
  oat: 0xd8ccb5,
  taupe: 0x9b8c7a,
  teal: 0x3e706d,
  saffron: 0xd9a441,
  vermilion: 0xc75c4a,
  chalk: 0xf2ebdd,
  bg: 0x14161d,
  panel: 0x1d212b,
};

export const C_TXT = {
  chalk: '#f2ebdd',
  saffron: '#d9a441',
  vermilion: '#c75c4a',
  taupe: '#9b8c7a',
  teal: '#3e706d',
  oat: '#d8ccb5',
};

export const FONT_TITLE = "'Fraunces', Georgia, 'Times New Roman', serif";
export const FONT_BODY = "'Source Sans 3', system-ui, -apple-system, sans-serif";
