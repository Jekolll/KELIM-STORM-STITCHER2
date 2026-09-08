import Phaser from 'phaser';
import { ASSETS, C, C_TXT, FONT_BODY, FONT_TITLE } from '../config/assets';
import { setBootStatus, showAssetErrorPanel, markBootDone } from '../utils/bootBridge';

export class BootScene extends Phaser.Scene {
  private failures: string[] = [];

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failures.push(`${file.key} → ${file.url}`);
    });
    // Update status "memuat" di overlay DOM seiring progres aset.
    this.load.on('progress', (p: number) => {
      setBootStatus(`memuat… ${Math.round((p ?? 0) * 100)}%`);
    });
    for (const a of ASSETS) {
      this.load.image(a.key, a.url);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#14161d');
    const fontsReady: Promise<unknown> =
      typeof document !== 'undefined' && 'fonts' in document
        ? (document as Document).fonts.ready
        : Promise.resolve();
    Promise.race([
      fontsReady,
      new Promise((r) => this.time.delayedCall(1600, () => r(true))),
    ]).then(() => {
      if (!this.sys.isActive()) return;
      if (this.failures.length > 0) {
        this.showAssetError();
      } else {
        markBootDone();
        this.scene.start('Menu');
      }
    });
  }

  private showAssetError(): void {
    const lines = this.failures.slice(0, 8).map((f) => `• ${f}`).join('\n');
    showAssetErrorPanel(
      `Aset gagal dimuat (${this.failures.length})`,
      `${lines}\n\nMuat ulang halaman untuk mencoba lagi.`,
    );

    // Tampilan in-scene sebagai cadangan bila overlay DOM tidak tersedia.
    this.add
      .text(480, 180, 'ASET GAGAL DIMUAT', {
        fontFamily: FONT_TITLE,
        fontSize: '30px',
        fontStyle: '700',
        color: C_TXT.vermilion,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(480, 250, lines, {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: C_TXT.chalk,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(480, 380, 'Muat ulang halaman untuk mencoba lagi.', {
        fontFamily: FONT_BODY,
        fontSize: '14px',
        color: C_TXT.taupe,
      })
      .setOrigin(0.5)
      .setDepth(10);
    void C;
  }
}
