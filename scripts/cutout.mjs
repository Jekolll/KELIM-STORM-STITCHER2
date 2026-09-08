// scripts/cutout.mjs
// Pipeline G3: flood-fill background removal (FIXED reference) + 1px alpha defringe.
// Metode fixed-reference: setiap langkah flood harus tetap dekat WARNA REFERENSI
// (rata-rata sampel tepi), bukan dekat piksel sebelumnya. Ini mencegah "chain leak"
// di mana gradien halus/kelembaban outline membiarkan flood merayap masuk ke karakter.
//
// Usage: node scripts/cutout.mjs <input.png> <output.png> [tolerance=12]
import sharp from 'sharp';
import { resolve } from 'node:path';

const [, , input, output, tolArg] = process.argv;
if (!input || !output) {
  console.error('Usage: node scripts/cutout.mjs <input.png> <output.png> [tolerance]');
  process.exit(1);
}
const TOL = Number.isFinite(Number(tolArg)) ? Number(tolArg) : 12;

async function main() {
  const inFile = resolve(input);
  const outFile = resolve(output);
  const { data, info } = await sharp(inFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const N = width * height;
  const idx = (x, y) => y * width + x;

  const px = (i) => [data[i * channels], data[i * channels + 1], data[i * channels + 2]];

  // Referensi = rata-rata warna zona tepi (100px), disampel longgar.
  let sum = [0, 0, 0];
  let n = 0;
  const sample = (x, y) => {
    const i = idx(x, y);
    sum[0] += data[i * channels];
    sum[1] += data[i * channels + 1];
    sum[2] += data[i * channels + 2];
    n++;
  };
  const M = 100;
  for (let x = 0; x < width; x += 7) {
    for (let y = 0; y < M; y += 7) sample(x, y);
    for (let y = height - M; y < height; y += 7) sample(x, y);
  }
  for (let y = M; y < height - M; y += 7) {
    for (let x = 0; x < M; x += 7) sample(x, y);
    for (let x = width - M; x < width; x += 7) sample(x, y);
  }
  const ref = sum.map((s) => s / n);
  const tol2 = TOL * TOL * 3;

  const isBg = (i) => {
    const dr = data[i * channels] - ref[0];
    const dg = data[i * channels + 1] - ref[1];
    const db = data[i * channels + 2] - ref[2];
    return dr * dr + dg * dg + db * db < tol2;
  };

  const bg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let qHead = 0;
  let qTail = 0;

  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = idx(x, y);
      if (isBg(i)) {
        bg[i] = 1;
        queue[qTail++] = i;
      }
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      const i = idx(x, y);
      if (isBg(i)) {
        bg[i] = 1;
        queue[qTail++] = i;
      }
    }
  }

  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % width;
    const y = (i / width) | 0;
    const neighbors = [];
    if (x > 0) neighbors.push(i - 1);
    if (x < width - 1) neighbors.push(i + 1);
    if (y > 0) neighbors.push(i - width);
    if (y < height - 1) neighbors.push(i + width);
    for (const nb of neighbors) {
      if (!bg[nb] && isBg(nb)) {
        bg[nb] = 1;
        queue[qTail++] = nb;
      }
    }
  }

  let removed = 0;
  for (let i = 0; i < N; i++) {
    if (bg[i]) {
      data[i * channels + 3] = 0;
      removed++;
    }
  }

  // Defringe 1px: piksel yang bersentuhan dengan transparan ikut dihapus
  // (membersihkan sisa bleed warna di tepi siluet).
  // PENTING: keputusan dibaca dari SNAPSHOT alpha asli (erosi 1px sejati),
  // bukan dari array yang sedang dimodifikasi — jika tidak, erosi akan
  // beruntun kaskade dan memakan seluruh karakter dalam satu pass.
  const alpha0 = new Uint8Array(N);
  for (let i = 0; i < N; i++) alpha0[i] = data[i * channels + 3];
  let defringed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      if (alpha0[i] === 0) continue;
      let t = false;
      if (x > 0 && alpha0[i - 1] === 0) t = true;
      else if (x < width - 1 && alpha0[i + 1] === 0) t = true;
      else if (y > 0 && alpha0[i - width] === 0) t = true;
      else if (y < height - 1 && alpha0[i + width] === 0) t = true;
      if (t) {
        data[i * channels + 3] = 0;
        defringed++;
      }
    }
  }

  const remaining = N - removed - defringed;
  const remainPct = (100 * remaining) / N;
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outFile);

  const warn =
    remainPct < 1
      ? ' !! PERHATIAN: <1% piksel tersisa — kemungkinan flood bocor, periksa visual'
      : '';
  console.log(
    `cutout: ${input} -> ${output} (${width}x${height}) tol=${TOL} ref=(${ref.map((v) => v.toFixed(0)).join(',')}) removed=${removed} defringed=${defringed} remaining=${remaining} (${remainPct.toFixed(1)}%)${warn}`,
  );
  if (remainPct < 1) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
