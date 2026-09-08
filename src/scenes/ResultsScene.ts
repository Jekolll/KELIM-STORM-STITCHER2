import Phaser from 'phaser';
import { C, C_TXT, FONT_BODY, FONT_TITLE } from '../config/assets';
import { drawArenaBackdrop, makeButton, makePanel, panelTitle } from '../ui/helpers';
import { audio } from '../systems/AudioManager';
import { setScene } from '../utils/bootBridge';
import { bindKeys, onKeyDown } from '../utils/keyboard';

export interface GameResultData {
  victory: boolean;
  score: number;
  best: number;
  newBest: boolean;
  catches: number;
  timeMs: number;
}

export class ResultsScene extends Phaser.Scene {
  private result: GameResultData = {
    victory: false,
    score: 0,
    best: 0,
    newBest: false,
    catches: 0,
    timeMs: 0,
  };

  constructor() {
    super('Results');
  }

  create(data: GameResultData): void {
    this.result = data;
    drawArenaBackdrop(this, 0.6);
    this.add.rectangle(480, 270, 960, 540, C.ink, 0.25).setDepth(2);

    const title = this.add
      .text(480, 120, this.result.victory ? 'KAIN PULIH' : 'KAIN TEROBEK', {
        fontFamily: FONT_TITLE,
        fontSize: '64px',
        fontStyle: '900',
        color: this.result.victory ? C_TXT.saffron : C_TXT.vermilion,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({ targets: title, scale: { from: 1.15, to: 1 }, alpha: { from: 0, to: 1 }, duration: 450 });

    this.add
      .text(480, 172, this.result.victory
        ? 'Semua benah tertangkap. Bengkel aman untuk malam ini.'
        : 'Kain sobek… tapi benangnya masih ada.', {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: C_TXT.chalk,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const panel = this.add.container(480, 300, [makePanel(this, 420, 200)]);
    panel.setDepth(10);
    const t = panelTitle(this, 0, HASIL);
    t.setPosition(480, 300 - 78);
    panel.add(t);

    const sec = Math.floor(this.result.timeMs / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    const rows: Array<[string, string]> = [
      ['SKOR', String(this.result.score).padStart(6, '0')],
      ['TERSIMPAN JAHITAN', String(this.result.catches)],
      ['WAKTU', `${mm}:${ss}`],
      ['TERBAIK', String(this.result.best).padStart(6, '0')],
    ];
    rows.forEach((r, i) => {
      const y = 300 - 36 + i * 34;
      panel.add(
        this.add
          .text(480 - 160, y, r[0], {
            fontFamily: FONT_BODY,
            fontSize: '14px',
            color: C_TXT.taupe,
            letterSpacing: 2,
          })
          .setOrigin(0, 0.5),
      );
      panel.add(
        this.add
          .text(480 + 160, y, r[1], {
            fontFamily: FONT_BODY,
            fontSize: '16px',
            fontStyle: '600',
            color: C_TXT.chalk,
          })
          .setOrigin(1, 0.5),
      );
    });

    if (this.result.newBest) {
      const badge = this.add
        .text(480 + 178, 300 - 36, 'REKOR!', {
          fontFamily: FONT_BODY,
          fontSize: '12px',
          fontStyle: '700',
          color: C_TXT.saffron,
        })
        .setOrigin(1, 0.5)
        .setDepth(12);
      this.tweens.add({ targets: badge, scale: 1.15, duration: 600, yoyo: true, repeat: 1 });
    }

    const bRetry = makeButton(this, 480, 458, 'MAIN LAGI', () => {
      audio.unlock();
      this.scene.start('Game');
    }, { w: 240, h: 56 });
    const bMenu = makeButton(this, 480, 518, 'MENU UTAMA', () => {
      audio.unlock();
      this.scene.start('Menu');
    }, { w: 240, h: 44, small: true });
    void bRetry;
    void bMenu;

    const k = bindKeys(this.input.keyboard, ['ENTER', 'ESC']);
    onKeyDown(k, 'ENTER', () => this.scene.start('Game'));
    onKeyDown(k, 'ESC', () => this.scene.start('Menu'));
    setScene('Results');
  }
}

const HASIL = 'HASIL';
