import Phaser from 'phaser';
import { C, C_TXT, FONT_BODY } from '../config/assets';
import { audio } from '../systems/AudioManager';
import type { Vec } from '../utils/geometry';

/** Border dashed ala jahitan: segmen pendek di sekeliling rect. */
export function stitchRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 1,
  lineWidth = 2,
  dash = 9,
  gap = 5,
): void {
  g.lineStyle(lineWidth, color, alpha);
  for (let px = x; px < x + w; px += dash + gap) {
    const end = Math.min(px + dash, x + w);
    g.lineBetween(px, y, end, y);
    g.lineBetween(px, y + h, end, y + h);
  }
  for (let py = y; py < y + h; py += dash + gap) {
    const end = Math.min(py + dash, y + h);
    g.lineBetween(x, py, x, end);
    g.lineBetween(x + w, py, x + w, end);
  }
}

/** Garis putus-putus antara dua titik (untuk preview jahitan invalid). */
export function dashLine(
  g: Phaser.GameObjects.Graphics,
  a: Vec,
  b: Vec,
  dash = 8,
  gap = 5,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  let d = 0;
  while (d < len) {
    const end = Math.min(d + dash, len);
    g.lineBetween(a.x + ux * d, a.y + uy * d, a.x + ux * end, a.y + uy * end);
    d = end + gap;
  }
}

export function drawNeedleIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2.5, C.saffron, 1);
  g.lineBetween(x - 5, y + 8, x + 5, y - 8);
  g.fillStyle(C.saffron, 1);
  g.fillCircle(x + 5, y - 8, 2.6);
}

export interface UiButton {
  container: Phaser.GameObjects.Container;
  setLabel(t: string): void;
  setEnabled(on: boolean): void;
  setFocused(on: boolean): void;
  destroy(): void;
}

export interface ButtonOpts {
  w?: number;
  h?: number;
  small?: boolean;
}

/**
 * Tombol gaya "label kain": panel gelap + border jahitan saffron.
 * Teks dirender tajam (bukan ditanam di gambar).
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  cb: () => void,
  opts: ButtonOpts = {},
): UiButton {
  const w = opts.w ?? 240;
  const h = opts.h ?? 56;
  const g = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT_BODY,
      fontSize: opts.small ? '14px' : '19px',
      fontStyle: '600',
      color: C_TXT.chalk,
      letterSpacing: opts.small ? 1 : 3,
    })
    .setOrigin(0.5);
  const hit = scene.add.zone(0, 0, Math.max(w, 56), Math.max(h, 56)).setInteractive();
  const cont = scene.add.container(x, y, [g, text, hit]);
  cont.setDepth(200);

  let enabled = true;
  let hover = false;
  let focused = false;
  let pressed = false;

  const draw = () => {
    g.clear();
    const bgAlpha = enabled ? (hover || focused ? 0.98 : 0.88) : 0.5;
    g.fillStyle(C.panel, bgAlpha);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    const border = !enabled ? C.taupe : hover || focused || pressed ? C.chalk : C.saffron;
    const borderAlpha = enabled ? 0.95 : 0.4;
    stitchRect(g, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, border, borderAlpha, 1.8);
    if (focused) {
      stitchRect(g, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, C.saffron, 0.8, 1.5, 6, 4);
    }
    const s = pressed ? 0.96 : focused || hover ? 1.03 : 1;
    cont.setScale(s);
    text.setColor(enabled ? C_TXT.chalk : C_TXT.taupe);
  };
  draw();

  hit.on('pointerover', () => {
    if (!enabled) return;
    hover = true;
    audio.play('ui-hover');
    draw();
  });
  hit.on('pointerout', () => {
    hover = false;
    pressed = false;
    draw();
  });
  hit.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    draw();
  });
  hit.on('pointerup', () => {
    if (!enabled) {
      pressed = false;
      draw();
      return;
    }
    pressed = false;
    draw();
    audio.play('ui');
    cb();
  });

  return {
    container: cont,
    setLabel(t: string) {
      text.setText(t);
    },
    setEnabled(on: boolean) {
      enabled = on;
      draw();
    },
    setFocused(on: boolean) {
      focused = on;
      draw();
    },
    destroy() {
      hit.removeAllListeners();
      cont.destroy();
    },
  };
}

/** Panel tengah gaya label kain, gelap, border jahitan. */
export function makePanel(
  scene: Phaser.Scene,
  w: number,
  h: number,
  alpha = 0.94,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(C.panel, alpha);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  stitchRect(g, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, C.saffron, 0.75, 1.6);
  const cont = scene.add.container(0, 0, [g]);
  cont.setDepth(210);
  return cont;
}

/** Latar arena (gambar arena di-crop cover ke 960x540) + layer gelap. */
export function drawArenaBackdrop(scene: Phaser.Scene, darkAlpha = 0.45): void {
  const img = scene.add.image(480, 270, 'arena');
  img.setScale(0.703);
  img.setDepth(0);
  scene.add.rectangle(480, 270, 960, 540, C.ink, darkAlpha).setDepth(1);
}

/** Vignette sederhana di tepi gameplay. */
export function drawVignette(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(5);
  g.fillStyle(C.ink, 0.22);
  g.fillRect(0, 0, 960, 26);
  g.fillRect(0, 514, 960, 26);
  g.fillRect(0, 0, 14, 540);
  g.fillRect(946, 0, 14, 540);
}

export function panelTitle(scene: Phaser.Scene, y: number, t: string): Phaser.GameObjects.Text {
  return scene.add
    .text(0, y, t, {
      fontFamily: "'Fraunces', Georgia, serif",
      fontSize: '26px',
      fontStyle: '700',
      color: C_TXT.chalk,
      letterSpacing: 4,
    })
    .setOrigin(0.5)
    .setDepth(215);
}
