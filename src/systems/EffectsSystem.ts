import Phaser from 'phaser';

/**
 * VFX runtime: partikel + telegraph spawn + screen shake.
 * Texture partikel kecil dibuat prosedural (bukan pengganti art utama);
 * jumlah partikel dibatasi agar performa stabil.
 */
export interface BurstOpts {
  color: number;
  count?: number;
  speed?: number;
  life?: number;
  size?: number;
  shape?: 'dot' | 'streak' | 'fleck';
  gravity?: number;
}

const MAX_PARTICLES = 160;
const MAX_PARTICLES_REDUCED = 70;

export class Effects {
  reduced = false;
  private scene: Phaser.Scene;
  private active = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.makeTextures();
  }

  private makeTextures(): void {
    if (this.scene.textures.exists('fx-dot')) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 7);
    g.generateTexture('fx-dot', 16, 16);
    g.clear();
    g.fillRoundedRect(0, 2, 14, 4, 2);
    g.generateTexture('fx-streak', 14, 8);
    g.clear();
    g.fillTriangle(1, 11, 7, 1, 11, 11);
    g.generateTexture('fx-fleck', 12, 12);
    g.destroy();
  }

  private cap(): number {
    return this.reduced ? MAX_PARTICLES_REDUCED : MAX_PARTICLES;
  }

  burst(x: number, y: number, o: BurstOpts): void {
    const want = o.count ?? 10;
    const n = Math.min(want, Math.max(0, this.cap() - this.active));
    if (n <= 0) return;
    this.active += n;
    const shape = o.shape ?? 'dot';
    const key = shape === 'streak' ? 'fx-streak' : shape === 'fleck' ? 'fx-fleck' : 'fx-dot';
    const em = this.scene.add.particles(0, 0, key, {
      speed: { min: (o.speed ?? 90) * 0.4, max: o.speed ?? 90 },
      angle: { min: 0, max: 360 },
      lifespan: { min: (o.life ?? 320) * 0.6, max: o.life ?? 320 },
      scale: { start: o.size ?? 1, end: 0.1 },
      alpha: { start: 1, end: 0 },
      tint: o.color,
      gravityY: o.gravity ?? 0,
      rotate: { min: 0, max: 360 },
      frequency: 0,
      emitting: false,
    });
    em.setDepth(60);
    em.explode(n, x, y);
    // emitter auto-destroy setelah partikel habis; selaraskan counter
    const life = Math.max((o.life ?? 320) * 1.2, 100);
    this.scene.time.delayedCall(life, () => {
      this.active = Math.max(0, this.active - n);
      if (em.active) em.destroy();
    });
  }

  trail(x: number, y: number, color: number): void {
    this.burst(x, y, { color, count: this.reduced ? 1 : 3, speed: 30, life: 220, size: 0.6 });
  }

  /**
   * Telegraph spawn: tanda jarum di tepi arena yang memudar saat siap.
   * Selesai tepat setelah warnMs (dipanggil GameScene untuk spawn).
   */
  spawnTelegraph(x: number, y: number, onReady: () => void): void {
    const g = this.scene.add.graphics();
    g.setPosition(x, y);
    g.setDepth(40);
    // jarum kecil
    g.lineStyle(3, 0xd9a441, 1);
    g.lineBetween(-8, 10, 8, -10);
    g.fillStyle(0xd9a441, 1);
    g.fillCircle(8, -10, 3.5);
    // ring
    const ring = this.scene.add.circle(x, y, 6, 0xc75c4a, 0.9);
    ring.setDepth(39);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 700,
      ease: 'Sine.easeIn',
      delay: 100,
      onComplete: () => {
        g.destroy();
        onReady();
      },
    });
  }

  /** Flash area jahitan yang baru resolve. */
  stitchFlash(tri: [Phaser.Types.Math.Vector2Like, Phaser.Types.Math.Vector2Like, Phaser.Types.Math.Vector2Like]): void {
    const g = this.scene.add.graphics();
    g.setDepth(35);
    g.fillStyle(0xd9a441, 0.28);
    g.fillPoints(tri, true);
    g.lineStyle(2.5, 0xf2ebdd, 0.85);
    g.strokePoints(tri, true);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }

  shake(units: number, ms: number): void {
    if (this.reduced) return;
    this.scene.cameras.main.shake(ms, units / 60);
  }

  dispose(): void {
    this.scene.children.each((c) => {
      if (c.type === 'ParticleSystem') c.destroy();
    });
  }
}
