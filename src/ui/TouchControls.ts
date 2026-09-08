import Phaser from 'phaser';
import { C } from '../config/assets';
import { pointerIsTouch } from '../utils/pointer';

export interface TouchCallbacks {
  onDodge: () => void;
  onCancel: () => void;
}

/**
 * Kontrol touch landscape: virtual stick (kiri bawah),
 * tombol SEGI + BATAS (kanan bawah), dan deteksi titik UI.
 * Penempatan jarum via tap/drag-aim ditangani GameScene.
 */
export class TouchControls {
  stickVec = { x: 0, y: 0 };
  enabled = false;
  stickActive = false;

  private scene: Phaser.Scene;
  private cbs: TouchCallbacks;
  private stickBase: Phaser.GameObjects.Ellipse;
  private stickNub: Phaser.GameObjects.Ellipse;
  private dodgeG: Phaser.GameObjects.Graphics;
  private cancelG: Phaser.GameObjects.Graphics;
  private dodgeHit: Phaser.GameObjects.Zone;
  private cancelHit: Phaser.GameObjects.Zone;
  private stickPointer: number | null = null;
  private dodgeReady = true;

  private static STICK_X = 120;
  private static STICK_Y = 452;
  private static MAX = 34;
  private static DODGE_X = 872;
  private static DODGE_Y = 468;
  private static CANCEL_X = 786;
  private static CANCEL_Y = 494;

  constructor(scene: Phaser.Scene, cbs: TouchCallbacks) {
    this.scene = scene;
    this.cbs = cbs;

    this.stickBase = scene.add.ellipse(
      TouchControls.STICK_X,
      TouchControls.STICK_Y,
      108,
      108,
      C.chalk,
      0.08,
    );
    this.stickNub = scene.add.ellipse(
      TouchControls.STICK_X,
      TouchControls.STICK_Y,
      52,
      52,
      C.chalk,
      0.3,
    );
    this.dodgeG = scene.add.graphics();
    this.cancelG = scene.add.graphics();
    this.dodgeHit = scene.add.zone(0, 0, 80, 80).setInteractive();
    this.cancelHit = scene.add.zone(0, 0, 68, 68).setInteractive();
    const dodgeCont = scene.add.container(
      TouchControls.DODGE_X,
      TouchControls.DODGE_Y,
      [this.dodgeG, this.dodgeHit],
    );
    const cancelCont = scene.add.container(
      TouchControls.CANCEL_X,
      TouchControls.CANCEL_Y,
      [this.cancelG, this.cancelHit],
    );
    dodgeCont.setDepth(1050);
    cancelCont.setDepth(1050);
    this.drawButtons();
    this.setAll(false);

    this.dodgeHit.on('pointerdown', () => {
      if (!this.enabled || !this.dodgeReady) return;
      this.dodgeReady = false;
      this.cbs.onDodge();
      this.drawButtons();
      this.scene.time.delayedCall(1100, () => {
        this.dodgeReady = true;
        this.drawButtons();
      });
    });
    this.cancelHit.on('pointerdown', () => {
      if (!this.enabled) return;
      this.cbs.onCancel();
    });

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled || !pointerIsTouch(p)) return;
      // zona stick: kiri bawah
      if (p.x < 440 && p.y > 330) {
        this.stickPointer = p.id;
        this.stickActive = true;
        this.stickNub.setPosition(p.x, p.y);
        this.updateStick(p);
      }
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.stickPointer === p.id) this.updateStick(p);
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (this.stickPointer === p.id) {
        this.stickPointer = null;
        this.stickActive = false;
        this.stickVec = { x: 0, y: 0 };
        this.stickNub.setPosition(
          TouchControls.STICK_X,
          TouchControls.STICK_Y,
        );
      }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointercancel', release);
  }

  private updateStick(p: Phaser.Input.Pointer): void {
    const dx = p.x - TouchControls.STICK_X;
    const dy = p.y - TouchControls.STICK_Y;
    const l = Math.hypot(dx, dy);
    const cl = Math.min(l, TouchControls.MAX);
    const a = l > 0 ? Math.atan2(dy, dx) : 0;
    const nx = Math.cos(a) * cl;
    const ny = Math.sin(a) * cl;
    this.stickNub.setPosition(
      TouchControls.STICK_X + nx,
      TouchControls.STICK_Y + ny,
    );
    this.stickVec = { x: nx / TouchControls.MAX, y: ny / TouchControls.MAX };
  }

  private drawButtons(): void {
    const g = this.dodgeG;
    g.clear();
    g.fillStyle(C.panel, this.enabled ? 0.9 : 0.4);
    g.fillCircle(0, 0, 38);
    g.lineStyle(2, this.dodgeReady && this.enabled ? C.saffron : C.taupe, 0.9);
    g.strokeCircle(0, 0, 33);
    g.fillStyle(C.chalk, this.enabled ? 0.95 : 0.4);
    g.fillTriangle(-12, 7, 13, 0, -12, -7);

    const c = this.cancelG;
    c.clear();
    c.fillStyle(C.panel, this.enabled ? 0.9 : 0.4);
    c.fillCircle(0, 0, 30);
    c.lineStyle(2, C.taupe, 0.9);
    c.strokeCircle(0, 0, 25);
    c.lineStyle(3, C.vermilion, this.enabled ? 0.95 : 0.4);
    c.lineBetween(-8, -8, 8, 8);
    c.lineBetween(8, -8, -8, 8);
  }

  /** Apakah titik (x,y) berada di atas kontrol touch (agar tidak memicu jahitan). */
  isUiPoint(x: number, y: number): boolean {
    if (!this.enabled) return false;
    if (Math.hypot(x - TouchControls.DODGE_X, y - TouchControls.DODGE_Y) < 44) return true;
    if (Math.hypot(x - TouchControls.CANCEL_X, y - TouchControls.CANCEL_Y) < 36) return true;
    if (x < 440 && y > 330) return true;
    return false;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    this.setAll(on);
  }

  private setAll(on: boolean): void {
    this.stickBase.setAlpha(on ? 1 : 0);
    this.stickNub.setAlpha(on ? 1 : 0);
    this.dodgeG.setAlpha(on ? 1 : 0);
    this.cancelG.setAlpha(on ? 1 : 0);
    if (on) {
      this.dodgeHit.setInteractive();
      this.cancelHit.setInteractive();
    } else {
      this.dodgeHit.disableInteractive();
      this.cancelHit.disableInteractive();
    }
  }
}
