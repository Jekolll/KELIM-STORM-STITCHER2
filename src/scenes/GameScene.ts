import Phaser from 'phaser';
import { C, C_TXT, FONT_BODY, FONT_TITLE } from '../config/assets';
import {
  ARENA,
  FEEL,
  GAME,
  PLAYER,
  SPAWN,
  STITCH,
} from '../config/tuning';
import { type Vec } from '../utils/geometry';
import { circleHitsTri } from '../utils/geometry';
import { mulberry32 } from '../utils/rng';
import { pickN } from '../utils/rng';
import { setScene } from '../utils/bootBridge';
import { bindKeys, isDown, onKeyDown, type KeyMap } from '../utils/keyboard';
import { ENCOUNTERS } from '../data/encounters';
import {
  BASE_STITCH,
  MODIFIERS,
  type ModifierDef,
  type StitchStats,
} from '../data/modifiers';
import { loadSave, persistSave, type SaveData } from '../storage/save';
import { audio } from '../systems/AudioManager';
import { Effects } from '../systems/EffectsSystem';
import { StitchSystem } from '../systems/StitchSystem';
import { EncounterDirector, pickSpawnPoint } from '../systems/EncounterDirector';
import { Player } from '../entities/Player';
import { EnemyBase } from '../entities/EnemyBase';
import { Serat } from '../entities/Serat';
import { Kutu } from '../entities/Kutu';
import { Hud } from '../ui/Hud';
import { TouchControls } from '../ui/TouchControls';
import {
  dashLine,
  drawArenaBackdrop,
  drawNeedleIcon,
  drawVignette,
  makeButton,
  makePanel,
  panelTitle,
} from '../ui/helpers';
import { pointerIsTouch } from '../utils/pointer';

type Phase = 'intro' | 'running' | 'reward' | 'victory' | 'defeat';

export class GameScene extends Phaser.Scene {
  private save: SaveData = loadSave();
  private rng: () => number = mulberry32(1);

  private player!: Player;
  private stitch!: StitchSystem;
  private director!: EncounterDirector;
  private fx!: Effects;
  private hud!: Hud;
  private touch!: TouchControls;
  private stitchG!: Phaser.GameObjects.Graphics;
  private enemies: EnemyBase[] = [];
  private deferred: Array<'serat' | 'kutu'> = [];

  private stats: StitchStats = { ...BASE_STITCH };
  private phase: Phase = 'intro';
  private phaseT = 0;
  private paused = false;
  private acc = 0;
  private hitStop = 0;
  private waveIndex = 0;
  private score = 0;
  private catches = 0;
  private runStart = 0;
  private finished = false;

  private keys: KeyMap | null = null;
  private inputDodge = false;
  private touchDodge = false;
  private previewPos: Vec | null = null;
  private aimPointer: number | null = null;

  private hintText: Phaser.GameObjects.Text | null = null;
  private pauseUi: Phaser.GameObjects.Container | null = null;
  private pauseDim: Phaser.GameObjects.Rectangle | null = null;
  private rewardUi: Phaser.GameObjects.Container | null = null;
  private rotateUi: Phaser.GameObjects.Container | null = null;
  private rotateBlocked = false;
  private lastHp = -1;

  constructor() {
    super('Game');
  }

  create(): void {
    this.save = loadSave();
    this.rng = mulberry32(((Date.now() % 100000) + 7) >>> 0);
    this.phase = 'intro';
    this.phaseT = 0;
    this.paused = false;
    this.acc = 0;
    this.hitStop = 0;
    this.waveIndex = 0;
    this.score = 0;
    this.catches = 0;
    this.finished = false;
    this.enemies = [];
    this.deferred = [];
    this.stats = { ...BASE_STITCH };
    this.inputDodge = false;
    this.touchDodge = false;
    this.previewPos = null;
    this.aimPointer = null;
    this.lastHp = -1;

    audio.setMuted(this.save.muted);
    audio.setSfxVolume(this.save.sfxVolume);
    audio.startAmbience();

    drawArenaBackdrop(this, 0);
    drawVignette(this);
    this.fx = new Effects(this);
    this.fx.reduced = this.save.reducedFx;

    this.player = new Player(this);
    this.player.reset(480, 300);
    this.player.onHurt = () => {
      this.fx.shake(4, 90);
      this.hud.flashHurt();
    };
    this.player.onDeath = () => this.beginEnd(false);

    this.stitchG = this.add.graphics().setDepth(50);
    this.stitch = new StitchSystem(
      this.stats,
      { arena: ARENA, minNeedleDist: STITCH.minNeedleDist, minArea: STITCH.minArea },
      { onResolve: (tri) => this.resolveStitch(tri) },
    );

    this.hud = new Hud(this);
    this.hud.setHp(this.player.hp, PLAYER.maxHp);
    this.hud.setScore(0);
    this.hud.setBest(this.save.best);
    this.hud.setEncounter(ENCOUNTERS[0].label, ENCOUNTERS[0].sub);
    this.hud.setProgress(0);

    this.director = new EncounterDirector(ENCOUNTERS[0]);
    this.director.start();

    // Onboarding: dua jarum awal membantu menutup jahitan pertama.
    if (!this.save.tutorialDone) {
      this.stitch.place({ x: 422, y: 254 }, this.player.pos);
      this.stitch.place({ x: 524, y: 236 }, this.player.pos);
      this.hintText = this.add
        .text(
          480,
          392,
          'Letakkan jarum ketiga di dalam area untuk menutup jahitannya',
          {
            fontFamily: FONT_BODY,
            fontSize: '15px',
            fontStyle: '600',
            color: C_TXT.saffron,
          }
        )
        .setOrigin(0.5)
        .setDepth(1100);
      this.tweens.add({
        targets: this.hintText,
        alpha: 0.55,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    this.touch = new TouchControls(this, {
      onDodge: () => {
        this.touchDodge = true;
      },
      onCancel: () => this.cancelStitch(),
    });
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    this.touch.setEnabled(isTouch);

    this.keys = bindKeys(this.input.keyboard, [
      'W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'Q', 'ESC',
    ]);
    onKeyDown(this.keys, 'SPACE', () => {
      if (this.phase === 'running' && !this.paused && !this.rotateBlocked) {
        this.inputDodge = true;
      }
    });
    onKeyDown(this.keys, 'ESC', () => {
      if (!this.rotateBlocked) this.togglePause();
    });
    onKeyDown(this.keys, 'Q', () => this.cancelStitch());

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!pointerIsTouch(p)) this.previewPos = { x: p.worldX, y: p.worldY };
      else if (this.aimPointer === p.id) this.previewPos = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (this.paused || this.rotateBlocked || this.phase !== 'running') return;
      if (this.touch.isUiPoint(p.x, p.y)) return;
      if (pointerIsTouch(p)) {
        this.aimPointer = p.id;
        this.previewPos = { x: p.worldX, y: p.worldY };
      } else {
        this.placeAt({ x: p.worldX, y: p.worldY });
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.aimPointer === p.id) {
        this.placeAt({ x: p.worldX, y: p.worldY });
        this.aimPointer = null;
      }
    });
    this.input.on('pointercancel', (p: Phaser.Input.Pointer) => {
      if (this.aimPointer === p.id) this.aimPointer = null;
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.checkOrientation());
    this.checkOrientation();

    this.runStart = this.time.now;
    this.showBanner(ENCOUNTERS[0].label, ENCOUNTERS[0].sub, C_TXT.chalk);
    setScene('Game');
  }

  update(_time: number, delta: number): void {
    if (this.rotateBlocked || this.paused) return;
    if (this.hitStop > 0) {
      this.hitStop -= delta;
      return;
    }
    this.acc += Math.min(delta, GAME.maxFrameMs);
    while (this.acc >= GAME.stepMs) {
      this.step(GAME.stepMs / 1000);
      this.acc -= GAME.stepMs;
    }
    this.updatePreview();
    this.updateHud();
  }

  private step(dt: number): void {
    audio.update(dt);
    this.phaseT += dt * 1000;

    if (this.phase === 'intro') {
      if (this.phaseT >= GAME.introMs) this.phase = 'running';
      return;
    }
    if (this.phase === 'reward') return;
    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.player.update(dt, { mx: 0, my: 0, dodge: false }, ARENA);
      if (this.phaseT >= GAME.endMs) this.finish();
      return;
    }

    // running
    const input = this.readInput();
    this.inputDodge = false;
    this.touchDodge = false;
    this.player.update(dt, input, ARENA);

    const spawns = this.director.update(dt * 1000);
    for (const t of spawns) this.deferred.push(t);
    while (this.deferred.length > 0 && this.aliveCount() < SPAWN.maxActive) {
      this.queueSpawn(this.deferred.shift() as 'serat' | 'kutu');
    }

    for (const e of this.enemies) if (!e.removed) e.update(dt, this.player);
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.director.setAlive(this.aliveCount());

    this.stitch.update(dt * 1000);

    if (!this.player.alive) {
      this.beginEnd(false);
      return;
    }
    if (this.director.isClear) {
      if (this.waveIndex < ENCOUNTERS.length - 1) this.beginReward();
      else this.beginEnd(true);
    }
  }

  private aliveCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  private readInput(): { mx: number; my: number; dodge: boolean } {
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (isDown(k, 'A', 'LEFT')) mx -= 1;
    if (isDown(k, 'D', 'RIGHT')) mx += 1;
    if (isDown(k, 'W', 'UP')) my -= 1;
    if (isDown(k, 'S', 'DOWN')) my += 1;
    mx += this.touch.stickVec.x;
    my += this.touch.stickVec.y;
    const l = Math.hypot(mx, my);
    if (l > 1) {
      mx /= l;
      my /= l;
    }
    return { mx, my, dodge: this.inputDodge || this.touchDodge };
  }

  private queueSpawn(type: 'serat' | 'kutu'): void {
    const pos = pickSpawnPoint(
      ARENA,
      this.player.pos,
      this.enemies.filter((e) => e.alive).map((e) => e.pos),
      this.rng,
    );
    audio.play('warn');
    this.fx.spawnTelegraph(pos.x, pos.y, () => {
      if (this.paused || this.rotateBlocked) return;
      if (this.phase === 'victory' || this.phase === 'defeat') return;
      this.spawnEnemy(type, pos);
    });
  }

  private spawnEnemy(type: 'serat' | 'kutu', pos: Vec): void {
    const e =
      type === 'serat' ? new Serat(this, this.fx, pos) : new Kutu(this, this.fx, pos);
    e.onDead = (pts) => {
      this.score += pts;
      this.hud.setScore(this.score);
    };
    this.enemies.push(e);
  }

  private placeAt(world: Vec): void {
    if (this.paused || this.rotateBlocked || this.phase !== 'running') return;
    const check = this.stitch.checkPlacement(world, this.player.pos);
    if (!check.ok) {
      audio.play('invalid');
      return;
    }
    const before = this.stitch.needles.length;
    this.stitch.place(world, this.player.pos);
    audio.play(before === 2 ? 'pull' : 'needle');
    this.fx.burst(world.x, world.y, {
      color: C.saffron,
      count: 4,
      speed: 60,
      life: 200,
      size: 0.5,
    });
  }

  private cancelStitch(): void {
    if (this.paused || this.rotateBlocked) return;
    if (this.stitch.cancel()) audio.play('ui');
  }

  private resolveStitch(tri: Vec[]): void {
    const [a, b, c] = tri;
    const targets = this.enemies.filter(
      (e) => e.alive && circleHitsTri(e.pos, e.radius, a, b, c),
    );
    for (const t of targets) t.damage(1, this.player.pos);
    this.catches += targets.length;
    if (targets.length >= 2) {
      this.score += (targets.length - 1) * STITCH.multiBonus;
      this.hitStop = FEEL.hitStopMs;
      this.fx.shake(FEEL.shakeUnits, FEEL.shakeMs);
      audio.play('multi');
    } else {
      audio.play('snap');
    }
    if (targets.length > 0) {
      this.fx.stitchFlash([a, b, c]);
    }
    this.hud.setScore(this.score);
    if (!this.save.tutorialDone) {
      this.save.tutorialDone = true;
      persistSave(this.save);
      this.hintText?.destroy();
      this.hintText = null;
    }
  }

  private beginReward(): void {
    this.phase = 'reward';
    this.phaseT = 0;
    audio.play('reward');
    const [m1, m2] = pickN(MODIFIERS, 2, this.rng);
    this.buildRewardUi(m1, m2);
  }

  private buildRewardUi(m1: ModifierDef, m2: ModifierDef): void {
    const cont = this.add.container(480, 270, [makePanel(this, 520, 220)]).setDepth(1200);
    this.add.rectangle(480, 270, 960, 540, C.ink, 0.5).setDepth(1190);
    const t = panelTitle(this, 0, 'BAHAN BARU');
    t.setPosition(0, -74);
    cont.add(t);
    const mkCard = (m: ModifierDef, x: number) => {
      const b = makeButton(
        this,
        x,
        26,
        m.name,
        () => this.applyModifier(m),
        { w: 200, h: 110, small: false },
      );
      const desc = this.add
        .text(x, 26 + 44, m.desc, {
          fontFamily: FONT_BODY,
          fontSize: '11px',
          color: C_TXT.taupe,
          align: 'center',
          wordWrap: { width: 170 },
        })
        .setOrigin(0.5)
        .setDepth(1210);
      cont.add(b.container);
      cont.add(desc);
      void b;
    };
    mkCard(m1, -130);
    mkCard(m2, 130);
    const hint = this.add
      .text(0, 92, 'tekan 1 / 2 atau klik kartu', {
        fontFamily: FONT_BODY,
        fontSize: '11px',
        color: C_TXT.taupe,
      })
      .setOrigin(0.5)
      .setDepth(1210);
    cont.add(hint);
    this.rewardUi = cont;

    const rk = bindKeys(this.input.keyboard, ['ONE', 'TWO']);
    onKeyDown(rk, 'ONE', () => this.applyModifier(m1));
    onKeyDown(rk, 'TWO', () => this.applyModifier(m2));
  }

  private applyModifier(m: ModifierDef): void {
    if (this.phase !== 'reward') return;
    m.apply(this.stats);
    this.stitch.stats = { ...this.stats };
    this.rewardUi?.destroy();
    this.rewardUi = null;
    this.children
      .list.filter((c) => c.type === 'Rectangle' && (c as Phaser.GameObjects.Rectangle).depth === 1190)
      .forEach((c) => c.destroy());
    this.nextWave();
  }

  private nextWave(): void {
    this.waveIndex += 1;
    if (this.waveIndex >= ENCOUNTERS.length) {
      this.beginEnd(true);
      return;
    }
    this.director = new EncounterDirector(ENCOUNTERS[this.waveIndex]);
    this.director.start();
    this.hud.setEncounter(ENCOUNTERS[this.waveIndex].label, ENCOUNTERS[this.waveIndex].sub);
    this.hud.setProgress(0);
    this.phase = 'intro';
    this.phaseT = 0;
    this.showBanner(ENCOUNTERS[this.waveIndex].label, ENCOUNTERS[this.waveIndex].sub, C_TXT.chalk);
  }

  private beginEnd(victory: boolean): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.phase = victory ? 'victory' : 'defeat';
    this.phaseT = 0;
    this.previewPos = null;
    if (victory) {
      this.score += this.player.hp * FEEL.victoryHpBonus;
      this.hud.setScore(this.score);
      audio.play('victory');
      this.showBanner('KAIN PULIH', 'semua benah tertangkap', C_TXT.saffron);
    } else {
      audio.play('defeat');
      this.showBanner('KAIN TEROBEK', 'penjahit jatuh', C_TXT.vermilion);
    }
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const timeMs = this.time.now - this.runStart;
    const newBest = this.score > this.save.best;
    if (newBest) this.save.best = this.score;
    persistSave(this.save);
    this.scene.start('Results', {
      victory: this.phase === 'victory',
      score: this.score,
      best: this.save.best,
      newBest,
      catches: this.catches,
      timeMs,
    });
  }

  private showBanner(title: string, sub: string, color: string): void {
    const t = this.add
      .text(480, 208, title, {
        fontFamily: FONT_TITLE,
        fontSize: '42px',
        fontStyle: '900',
        color,
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(1100)
      .setAlpha(0);
    const s = this.add
      .text(480, 246, sub, {
        fontFamily: FONT_BODY,
        fontSize: '15px',
        color: C_TXT.chalk,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(1100)
      .setAlpha(0);
    this.tweens.add({
      targets: [t, s],
      alpha: 1,
      duration: 220,
      onComplete: () => {
        this.tweens.add({
          targets: [t, s],
          alpha: 0,
          duration: 320,
          delay: 1000,
          onComplete: () => {
            t.destroy();
            s.destroy();
          },
        });
      },
    });
  }

  private togglePause(): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    if (!this.paused) {
      this.paused = true;
      this.tweens.pauseAll();
      this.buildPauseUi();
    } else {
      this.destroyPauseUi();
      this.tweens.resumeAll();
      this.paused = false;
    }
  }

  private buildPauseUi(): void {
    this.pauseDim = this.add.rectangle(480, 270, 960, 540, C.ink, 0.62).setDepth(1195);
    const cont = this.add.container(480, 270, [makePanel(this, 400, 300)]).setDepth(1200);
    const t = panelTitle(this, 0, 'JEDA');
    t.setPosition(0, -110);
    cont.add(t);

    const bResume = makeButton(this, 0, -52, 'LANJUTKAN', () => this.togglePause(), { w: 240, h: 46 });
    cont.add(bResume.container);
    const bRestart = makeButton(this, 0, 2, 'ULANGI', () => this.scene.restart(), { w: 240, h: 46 });
    cont.add(bRestart.container);
    const bMenu = makeButton(this, 0, 56, 'MENU UTAMA', () => this.scene.start('Menu'), {
      w: 240,
      h: 46,
    });
    cont.add(bMenu.container);

    const bMute = makeButton(
      this,
      -104,
      108,
      this.save.muted ? 'BUNYI: MATI' : 'BUNYI: AKTIF',
      () => {
        this.save.muted = !this.save.muted;
        audio.setMuted(this.save.muted);
        persistSave(this.save);
        bMute.setLabel(this.save.muted ? 'BUNYI: MATI' : 'BUNYI: AKTIF');
      },
      { w: 190, h: 40, small: true },
    );
    cont.add(bMute.container);
    const bFx = makeButton(
      this,
      104,
      108,
      this.save.reducedFx ? 'EFEK: RENDAH' : 'EFEK: PENUH',
      () => {
        this.save.reducedFx = !this.save.reducedFx;
        this.fx.reduced = this.save.reducedFx;
        persistSave(this.save);
        bFx.setLabel(this.save.reducedFx ? 'EFEK: RENDAH' : 'EFEK: PENUH');
      },
      { w: 190, h: 40, small: true },
    );
    cont.add(bFx.container);
    this.pauseUi = cont;
  }

  private destroyPauseUi(): void {
    this.pauseUi?.destroy();
    this.pauseUi = null;
    this.pauseDim?.destroy();
    this.pauseDim = null;
  }

  private checkOrientation(): void {
    const portrait =
      typeof window !== 'undefined' &&
      window.innerHeight > window.innerWidth * 1.05;
    if (portrait && !this.rotateBlocked) {
      this.rotateBlocked = true;
      this.tweens.pauseAll();
      const cont = this.add.container(0, 0, []).setDepth(1500);
      const g = this.add.graphics();
      g.fillStyle(C.ink, 0.92);
      g.fillRect(0, 0, 960, 540);
      cont.add(g);
      const phone = this.add.graphics();
      phone.lineStyle(3, C.saffron, 1);
      phone.strokeRoundedRect(-40, -24, 48, 48, 8);
      phone.setRotation(-Math.PI / 2);
      cont.add(phone);
      cont.add(
        this.add
          .text(0, 60, 'PUTAR PERANGKAT KE LANDSCAPE', {
            fontFamily: FONT_BODY,
            fontSize: '18px',
            fontStyle: '600',
            color: C_TXT.chalk,
            letterSpacing: 2,
          })
          .setOrigin(0.5),
      );
      this.rotateUi = cont;
      cont.setPosition(480, 240);
    } else if (!portrait && this.rotateBlocked) {
      this.rotateBlocked = false;
      this.rotateUi?.destroy();
      this.rotateUi = null;
      this.tweens.resumeAll();
    }
  }

  private updatePreview(): void {
    const g = this.stitchG;
    g.clear();
    if (
      this.paused ||
      this.rotateBlocked ||
      this.phase === 'victory' ||
      this.phase === 'defeat' ||
      this.phase === 'reward'
    ) {
      return;
    }
    const p = this.player.pos;
    const needles = this.stitch.needles;

    // jangkauan penempatan (sangat redup)
    g.lineStyle(1, C.saffron, 0.09);
    g.strokeCircle(p.x, p.y, this.stitch.stats.maxPlacementDist);

    for (const n of needles) drawNeedleIcon(g, n.x, n.y);

    if (this.stitch.phase === 'closing' && needles.length === 3) {
      g.fillStyle(C.saffron, 0.16);
      g.fillPoints(needles, true);
      g.lineStyle(2.5, C.chalk, 0.95);
      g.strokePoints(needles, true);
      return;
    }
    if (!this.stitch.canPlace()) return;
    const pv = this.previewPos;
    if (!pv) return;
    const check = this.stitch.checkPlacement(pv, p);

    if (needles.length === 1) {
      if (check.ok) {
        g.lineStyle(2, C.saffron, 0.85);
        g.lineBetween(needles[0].x, needles[0].y, pv.x, pv.y);
      } else {
        g.lineStyle(2, C.vermilion, 0.7);
        dashLine(g, needles[0], pv);
        this.drawX(g, pv);
      }
    } else if (needles.length === 2) {
      g.lineStyle(2, C.saffron, 0.85);
      g.lineBetween(needles[0].x, needles[0].y, needles[1].x, needles[1].y);
      if (check.ok) {
        g.lineStyle(2, C.saffron, 0.85);
        g.lineBetween(needles[1].x, needles[1].y, pv.x, pv.y);
        g.fillStyle(C.saffron, 0.1);
        g.fillPoints([needles[0], needles[1], pv], true);
        g.lineStyle(1.5, C.chalk, 0.8);
        g.strokePoints([needles[0], needles[1], pv], true);
      } else {
        g.lineStyle(2, C.vermilion, 0.6);
        dashLine(g, needles[1], pv);
        this.drawX(g, pv);
      }
    }
  }

  private drawX(g: Phaser.GameObjects.Graphics, p: Vec): void {
    g.lineStyle(3, C.vermilion, 0.9);
    g.lineBetween(p.x - 6, p.y - 6, p.x + 6, p.y + 6);
    g.lineBetween(p.x + 6, p.y - 6, p.x - 6, p.y + 6);
  }

  private updateHud(): void {
    const hp = this.player.hp;
    if (hp !== this.lastHp) {
      this.lastHp = hp;
      this.hud.setHp(hp, PLAYER.maxHp);
    }
    this.hud.setStitch(
      this.stitch.needles.length,
      this.stitch.phase,
      this.stitch.cooldownRemaining() / this.stitch.stats.cooldownMs,
    );
    this.hud.setDodge(1 - this.player.dodgeCdRatio * (this.player.dodgeReady ? 0 : 1));
    if (this.phase === 'running') this.hud.setProgress(this.director.progress);
  }

  shutdown(): void {
    this.destroyPauseUi();
    this.rewardUi?.destroy();
    this.rewardUi = null;
    this.rotateUi?.destroy();
    this.rotateUi = null;
  }
}
