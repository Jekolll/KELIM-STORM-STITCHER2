import Phaser from 'phaser';
import { C, C_TXT, FONT_BODY, FONT_TITLE } from '../config/assets';

/**
 * HUD in-game: HP (ikon jarum), encounter + progres, skor,
 * state jahitan (3 slot), dan indikator segir (dodge).
 */
export class Hud {
  private scene: Phaser.Scene;
  private hpG: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;
  private encLabel: Phaser.GameObjects.Text;
  private encSub: Phaser.GameObjects.Text;
  private encBar: Phaser.GameObjects.Graphics;
  private slotG: Phaser.GameObjects.Graphics;
  private stateText: Phaser.GameObjects.Text;
  private dodgeG: Phaser.GameObjects.Graphics;
  private dodgeLabel: Phaser.GameObjects.Text;
  private hurtFrame: Phaser.GameObjects.Graphics;
  private lastHp = -1;
  private lastScore = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.hpG = scene.add.graphics().setDepth(1000);

    this.scoreText = scene.add
      .text(934, 16, '000000', {
        fontFamily: FONT_BODY,
        fontSize: '20px',
        fontStyle: '600',
        color: C_TXT.chalk,
      })
      .setOrigin(1, 0.5)
      .setDepth(1000);
    this.bestText = scene.add
      .text(934, 38, 'TERBAIK 000000', {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: C_TXT.taupe,
        letterSpacing: 1,
      })
      .setOrigin(1, 0.5)
      .setDepth(1000);

    this.encLabel = scene.add
      .text(480, 14, '', {
        fontFamily: FONT_TITLE,
        fontSize: '15px',
        fontStyle: '700',
        color: C_TXT.chalk,
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);
    this.encSub = scene.add
      .text(480, 33, '', {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: C_TXT.saffron,
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);
    this.encBar = scene.add.graphics().setDepth(1000);

    this.slotG = scene.add.graphics().setDepth(1000);
    this.stateText = scene.add
      .text(480, 528, '', {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: C_TXT.taupe,
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(1000);

    this.dodgeG = scene.add.graphics().setDepth(1000);
    this.dodgeLabel = scene.add
      .text(26, 514, 'SEGI', {
        fontFamily: FONT_BODY,
        fontSize: '10px',
        color: C_TXT.taupe,
        letterSpacing: 2,
      })
      .setOrigin(0, 0)
      .setDepth(1000);

    this.hurtFrame = scene.add.graphics().setDepth(1010);
  }

  private drawNeedle(x: number, y: number, full: boolean): void {
    const g = this.hpG;
    g.lineStyle(2.5, full ? C.saffron : C.taupe, full ? 1 : 0.4);
    g.lineBetween(x - 4, y + 7, x + 4, y - 7);
    g.fillStyle(full ? C.saffron : C.taupe, full ? 1 : 0.4);
    g.fillCircle(x + 4, y - 7, 2.2);
  }

  setHp(n: number, max: number): void {
    if (n === this.lastHp) return;
    this.lastHp = n;
    const g = this.hpG;
    g.clear();
    for (let i = 0; i < max; i++) {
      this.drawNeedle(24 + i * 26, 26, i < n);
    }
  }

  setScore(n: number): void {
    if (n === this.lastScore) return;
    this.lastScore = n;
    this.scoreText.setText(String(Math.max(0, Math.floor(n))).padStart(6, '0'));
  }

  setBest(n: number): void {
    this.bestText.setText(`TERBAIK ${String(Math.max(0, Math.floor(n))).padStart(6, '0')}`);
  }

  setEncounter(label: string, sub: string): void {
    this.encLabel.setText(label);
    this.encSub.setText(sub);
  }

  setProgress(p: number): void {
    const g = this.encBar;
    g.clear();
    g.fillStyle(C.taupe, 0.4);
    g.fillRect(380, 50, 200, 3);
    g.fillStyle(C.saffron, 0.9);
    g.fillRect(380, 50, 200 * Math.min(1, Math.max(0, p)), 3);
  }

  setStitch(count: number, phase: 'open' | 'closing' | 'cooldown', cdRatio: number): void {
    const g = this.slotG;
    g.clear();
    for (let i = 0; i < 3; i++) {
      const x = 456 + i * 24;
      const y = 508;
      if (i < count) {
        g.fillStyle(C.saffron, 1);
        g.fillCircle(x, y, 6);
      } else {
        g.lineStyle(1.6, C.taupe, 0.7);
        g.strokeCircle(x, y, 6);
      }
    }
    // arc cooldown kecil di samping slot
    if (phase === 'cooldown' && cdRatio > 0.01) {
      const a0 = -Math.PI / 2;
      const a1 = a0 + Math.PI * 2 * Math.min(1, cdRatio);
      g.lineStyle(3, C.saffron, 0.85);
      g.beginPath();
      g.arc(534, 508, 8, a0, a1, false);
      g.stroke();
    }
    const label =
      phase === 'closing' ? 'MENEGANG…' : phase === 'cooldown' ? 'BENANG DIKUNCI' : count > 0 ? `JAHITAN TERBUKA (${count}/3)` : 'SIAP MENJAHIT';
    this.stateText.setText(label);
    this.stateText.setColor(phase === 'closing' ? C_TXT.saffron : C_TXT.taupe);
  }

  setDodge(ratio: number): void {
    const g = this.dodgeG;
    g.clear();
    const ready = ratio >= 1;
    g.fillStyle(C.taupe, 0.5);
    g.fillRect(26, 526, 44, 4);
    g.fillStyle(ready ? C.saffron : C.taupe, ready ? 1 : 0.8);
    g.fillRect(26, 526, 44 * Math.min(1, Math.max(0, ratio)), 4);
    this.dodgeLabel.setColor(ready ? C_TXT.saffron : C_TXT.taupe);
  }

  flashHurt(): void {
    const g = this.hurtFrame;
    g.clear();
    g.lineStyle(10, C.vermilion, 0.5);
    g.strokeRect(5, 5, 950, 530);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 240, onComplete: () => g.clear() });
  }

  dispose(): void {
    this.hpG.destroy();
    this.scoreText.destroy();
    this.bestText.destroy();
    this.encLabel.destroy();
    this.encSub.destroy();
    this.encBar.destroy();
    this.slotG.destroy();
    this.stateText.destroy();
    this.dodgeG.destroy();
    this.dodgeLabel.destroy();
    this.hurtFrame.destroy();
  }
}
