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
    // JANGAN menunggu document.fonts.ready di sini: di sebagian browser/headless
    // promise itu tidak pernah resolve. Fallback lama berbasis this.time.delayedCall
    // juga tidak menyelamatkan karena clock Phaser ikut macet saat RAF tidak jalan
    // (tab hidden, bot/crawler, dsb). Akibatnya boot stuck di "memuat… 100%".
    // Font punya fallback lokal yang layak (Georgia/system-ui, lihat config/assets)
    // dan @fontsource akan swap-in begitu selesai, jadi aman lanjut tanpa menunggu.
    if (!this.sys.isActive()) return;
    if (this.failures.length > 0) {
      this.showAssetError();
    } else {
      markBootDone();
      this.scene.start('Menu');
    }
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
