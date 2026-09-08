import Phaser from 'phaser';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultsScene } from './scenes/ResultsScene';

declare global {
  interface Window {
    __kelimShowLoading?: (msg?: string) => void;
    __kelimSetStatus?: (msg: string) => void;
    __kelimBootDone?: () => void;
    __kelimShowError?: (title: string, detail: string) => void;
  }
}

/**
 * Tampilkan layar "memuat" sejak awal, lalu bootstrap Phaser di dalam try/catch.
 * Jika game gagal dibuat (mis. WebGL / bundle / scene), error diarahkan ke
 * panel error di index.html — bukan halaman blank tanpa penjelasan.
 */
window.__kelimShowLoading?.('memuat…');

try {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: 960,
    height: 540,
    backgroundColor: '#14161d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
    },
    scene: [BootScene, MenuScene, GameScene, ResultsScene],
  });
} catch (err) {
  window.__kelimShowError?.(
    'Game gagal boot',
    err instanceof Error ? err.message : String(err),
  );
  console.error('KELIM: gagal membuat Phaser.Game', err);
  throw err;
}
