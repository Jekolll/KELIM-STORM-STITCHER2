import Phaser from 'phaser';
import { C, C_TXT, FONT_BODY, FONT_TITLE } from '../config/assets';
import { loadSave, persistSave, clearSave, type SaveData } from '../storage/save';
import { audio } from '../systems/AudioManager';
import { setScene } from '../utils/bootBridge';
import { bindKeys, onKeyDown } from '../utils/keyboard';
import {
  makeButton,
  makePanel,
  panelTitle,
  drawArenaBackdrop,
  type UiButton,
} from '../ui/helpers';

type PanelKind = 'none' | 'settings' | 'controls';

export class MenuScene extends Phaser.Scene {
  private save: SaveData = loadSave();
  private panel: PanelKind = 'none';
  private panelDim: Phaser.GameObjects.Rectangle | null = null;
  private panelCont: Phaser.GameObjects.Container | null = null;
  private btns: UiButton[] = [];
  private focusIdx = 0;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.save = loadSave();
    audio.setMuted(this.save.muted);
    audio.setSfxVolume(this.save.sfxVolume);
    drawArenaBackdrop(this, 0.52);

    // serat kecil yang "mengawasi" dari tepi (kehidupan menu)
    const serat = this.add.image(836, 470, 'serat');
    serat.setScale(0.052);
    serat.setAlpha(0.9);
    this.tweens.add({
      targets: serat,
      y: 458,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(480, 148, 'KELIM', {
        fontFamily: FONT_TITLE,
        fontSize: '96px',
        fontStyle: '900',
        color: C_TXT.chalk,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const underline = this.add.graphics().setDepth(10);
    for (let px = 380; px < 580; px += 14) {
      underline.lineStyle(2, C.saffron, 0.8);
      underline.lineBetween(px, 210, Math.min(px + 9, 580), 210);
    }
    this.add
      .text(480, 238, 'STORM STITCHER', {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        fontStyle: '600',
        color: C_TXT.saffron,
        letterSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(10);

    if (this.save.best > 0) {
      this.add
        .text(480, 266, `TERBAIK ${String(this.save.best).padStart(6, '0')}`, {
          fontFamily: FONT_BODY,
          fontSize: '13px',
          color: C_TXT.taupe,
          letterSpacing: 2,
        })
        .setOrigin(0.5)
        .setDepth(10);
    }

    const bPlay = makeButton(this, 480, 332, 'MULAI', () => this.scene.start('Game'), {
      w: 250,
      h: 58,
    });
    const bSettings = makeButton(this, 480, 400, 'PENGATURAN', () => this.openPanel('settings'), {
      w: 250,
      h: 48,
    });
    const bControls = makeButton(this, 480, 458, 'KONTROL', () => this.openPanel('controls'), {
      w: 250,
      h: 48,
    });
    this.btns = [bPlay, bSettings, bControls];
    this.setFocused(this.focusIdx);

    this.add
      .text(480, 514, 'WASD gerak  ·  Spasi segir  ·  Klik jahit  ·  Esc jeda', {
        fontFamily: FONT_BODY,
        fontSize: '12px',
        color: C_TXT.taupe,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(480, 532, 'vertikal slice v0.1 — desktop keyboard + mouse · touch landscape', {
        fontFamily: FONT_BODY,
        fontSize: '10px',
        color: C_TXT.taupe,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0.7);

    const k = bindKeys(this.input.keyboard, ['UP', 'DOWN', 'ENTER', 'ESC']);
    onKeyDown(k, 'UP', () => this.navigate(-1));
    onKeyDown(k, 'DOWN', () => this.navigate(1));
    onKeyDown(k, 'ENTER', () => {
      audio.unlock();
      this.activate(this.focusIdx);
    });
    onKeyDown(k, 'ESC', () => this.togglePanel());
    setScene('Menu');
  }

  private navigate(dir: number): void {
    if (this.panel !== 'none') return;
    this.focusIdx = (this.focusIdx + dir + this.btns.length) % this.btns.length;
    this.setFocused(this.focusIdx);
    audio.play('ui-hover');
  }

  private activate(idx: number): void {
    audio.unlock();
    if (idx === 0) this.scene.start('Game');
    else if (idx === 1) this.openPanel('settings');
    else this.openPanel('controls');
  }

  private setFocused(idx: number): void {
    this.btns.forEach((b, i) => b.setFocused(i === idx));
  }

  private togglePanel(): void {
    if (this.panel === 'none') this.openPanel('settings');
    else this.closePanel();
  }

  private openPanel(kind: Exclude<PanelKind, 'none'>): void {
    this.closePanel();
    this.panel = kind;
    const W = 480;
    const H = kind === 'settings' ? 340 : 330;
    this.panelDim = this.add.rectangle(480, 270, 960, 540, C.ink, 0.55).setDepth(205);
    const cont = this.add.container(480, 270, [makePanel(this, W, H)]).setDepth(206);

    if (kind === 'settings') {
      const t = panelTitle(this, 0, 'PENGATURAN');
      t.setPosition(0, -134);
      cont.add(t);

      const muteBtn = makeButton(this, 0, -74, this.save.muted ? 'BUNYI: MATI' : 'BUNYI: AKTIF', () => {
        this.save.muted = !this.save.muted;
        audio.setMuted(this.save.muted);
        persistSave(this.save);
        muteBtn.setLabel(this.save.muted ? 'BUNYI: MATI' : 'BUNYI: AKTIF');
      }, { w: 210, h: 44, small: true });
      cont.add(muteBtn.container);

      const volLabels = ['RENDAH', 'SEDANG', 'TINGGI'];
      const volVals = [0.3, 0.6, 1.0];
      const curIdx = volVals.indexOf(this.save.sfxVolume);
      const volBtns: UiButton[] = [];
      volLabels.forEach((l, i) => {
        const b = makeButton(this, (i - 1) * 132, -18, l, () => {
          this.save.sfxVolume = volVals[i];
          audio.setSfxVolume(this.save.sfxVolume);
          persistSave(this.save);
          volBtns.forEach((vb, j) => vb.setLabel(j === i ? `✓ ${volLabels[j]}` : volLabels[j]));
        }, { w: 120, h: 40, small: true });
        if (i === (curIdx === -1 ? 1 : curIdx)) b.setLabel(`✓ ${l}`);
        cont.add(b.container);
        volBtns.push(b);
      });

      const fxBtn = makeButton(this, 0, 42, this.save.reducedFx ? 'EFEK DITURUNKAN: AKTIF' : 'EFEK DITURUNKAN: MATI', () => {
        this.save.reducedFx = !this.save.reducedFx;
        persistSave(this.save);
        fxBtn.setLabel(this.save.reducedFx ? 'EFEK DITURUNKAN: AKTIF' : 'EFEK DITURUNKAN: MATI');
      }, { w: 320, h: 44, small: true });
      cont.add(fxBtn.container);

      const resetBtn = makeButton(this, 0, 108, 'RESET PROGRES', () => {
        clearSave();
        this.save = loadSave();
        this.scene.restart();
      }, { w: 200, h: 38, small: true });
      cont.add(resetBtn.container);

      const close = makeButton(this, 0, 154, 'TUTUP', () => this.closePanel(), { w: 170, h: 42, small: true });
      cont.add(close.container);
    } else {
      const t = panelTitle(this, 0, 'KONTROL');
      t.setPosition(0, -128);
      cont.add(t);
      const rows: Array<[string, string]> = [
        ['WASD / Panah', 'gerak'],
        ['Spasi', 'segir (hindar singkat)'],
        ['Klik Kiri', 'tempatkan jarum — 3 jarum menutup jahitan'],
        ['Klik Kanan / Q', 'batalkan pola'],
        ['Esc', 'jeda'],
        ['Touch', 'stick kiri · ketuk arena = jarum · tombol kanan'],
      ];
      rows.forEach((r, i) => {
        const y = -82 + i * 34;
        const isTouch = i === rows.length - 1;
        cont.add(
          this.add
            .text(-200, y, r[0], {
              fontFamily: FONT_BODY,
              fontSize: '14px',
              fontStyle: '600',
              color: isTouch ? C_TXT.saffron : C_TXT.chalk,
            })
            .setOrigin(0, 0.5),
        );
        cont.add(
          this.add
            .text(-58, y, r[1], {
              fontFamily: FONT_BODY,
              fontSize: '14px',
              color: isTouch ? C_TXT.saffron : C_TXT.taupe,
            })
            .setOrigin(0, 0.5),
        );
      });
      const close = makeButton(this, 0, 154, 'TUTUP', () => this.closePanel(), { w: 170, h: 42, small: true });
      cont.add(close.container);
    }
    this.panelCont = cont;
  }

  private closePanel(): void {
    this.panelCont?.destroy();
    this.panelCont = null;
    this.panelDim?.destroy();
    this.panelDim = null;
    this.panel = 'none';
  }

  shutdown(): void {
    this.panelCont?.destroy();
    this.panelCont = null;
    this.panelDim?.destroy();
    this.panelDim = null;
  }
}
