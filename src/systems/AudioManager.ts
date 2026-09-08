/**
 * AudioManager — semua audio disintesis secara prosedural lewat WebAudio.
 * Tidak ada file audio eksternal pada slice ini; gaya suara: kain, benang,
 * jarum, dan angin bengkel. Polyphony dibatasi, bus terpisah sfx/ambience.
 */
export type SfxName =
  | 'needle'
  | 'pull'
  | 'snap'
  | 'hit'
  | 'multi'
  | 'hurt'
  | 'dodge'
  | 'ui'
  | 'ui-hover'
  | 'invalid'
  | 'reward'
  | 'victory'
  | 'defeat'
  | 'warn'
  | 'death';

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private ambNodes: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;
  private creakIn = 6;

  muted = false;
  sfxVolume = 0.8;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Panggil dari gesture pengguna pertama (pointerdown/keydown). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);
    this.ambBus = this.ctx.createGain();
    this.ambBus.gain.value = 0.5;
    this.ambBus.connect(this.master);
    this.noiseBuf = this.makeNoise(1);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.015);
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.min(1, Math.max(0, v));
    if (this.ctx && this.sfxBus) {
      this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    }
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // brownish noise: lebih hangat untuk ambience kain
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  startAmbience(): void {
    if (!this.ctx || !this.ambBus || !this.noiseBuf || this.ambNodes) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.ambBus);
    src.start();
    lfo.start();
    this.ambNodes = { src, gain, lfo };
    this.creakIn = 5;
  }

  stopAmbience(): void {
    if (!this.ambNodes) return;
    try {
      this.ambNodes.src.stop();
      this.ambNodes.lfo.stop();
    } catch {
      // sudah berhenti
    }
    this.ambNodes = null;
  }

  /** Dipanggil tiap step gameplay; menjadwalkan creak sesekali. */
  update(dtSec: number): void {
    if (!this.ready || !this.ambNodes) return;
    this.creakIn -= dtSec;
    if (this.creakIn <= 0) {
      this.creakIn = 6 + Math.random() * 9;
      this.creak();
    }
  }

  private creak(): void {
    if (!this.ctx || !this.ambBus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(95, t + 0.35);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 420;
    f.Q.value = 4;
    o.connect(f);
    f.connect(g);
    g.connect(this.ambBus);
    o.start(t);
    o.stop(t + 0.45);
  }

  private tone(
    bus: GainNode,
    type: OscillatorType,
    from: number,
    dur: number,
    gain: number,
    to?: number,
    delay = 0,
  ): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(
    bus: GainNode,
    dur: number,
    gain: number,
    filter: BiquadFilterType,
    from: number,
    to?: number,
    q = 1,
    delay = 0,
  ): void {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(from, t);
    if (to !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxBus || this.muted) return;
    const bus = this.sfxBus;
    switch (name) {
      case 'needle':
        this.tone(bus, 'triangle', 940, 0.07, 0.22, 640);
        this.noise(bus, 0.03, 0.1, 'highpass', 4000);
        break;
      case 'pull':
        this.noise(bus, 0.16, 0.16, 'bandpass', 260, 1400, 2.5);
        this.tone(bus, 'sawtooth', 170, 0.16, 0.07, 260);
        break;
      case 'snap':
        this.tone(bus, 'sine', 130, 0.16, 0.5, 46);
        this.noise(bus, 0.09, 0.24, 'lowpass', 500);
        break;
      case 'hit':
        this.noise(bus, 0.09, 0.3, 'bandpass', 1700, 900, 3);
        this.tone(bus, 'square', 240, 0.05, 0.08, 180);
        break;
      case 'multi':
        this.tone(bus, 'sine', 140, 0.2, 0.5, 50);
        this.noise(bus, 0.14, 0.3, 'bandpass', 1300, 600, 2.5);
        this.tone(bus, 'triangle', 660, 0.12, 0.14, 880, 0.03);
        break;
      case 'hurt':
        this.tone(bus, 'sine', 96, 0.3, 0.5, 48);
        this.noise(bus, 0.2, 0.2, 'lowpass', 300);
        break;
      case 'dodge':
        this.noise(bus, 0.12, 0.14, 'bandpass', 900, 320, 1.5);
        break;
      case 'ui':
        this.tone(bus, 'triangle', 520, 0.05, 0.12, 470);
        break;
      case 'ui-hover':
        this.tone(bus, 'triangle', 380, 0.04, 0.05, 420);
        break;
      case 'invalid':
        this.tone(bus, 'square', 128, 0.07, 0.1, 110);
        break;
      case 'reward':
        this.tone(bus, 'triangle', 523.25, 0.14, 0.16);
        this.tone(bus, 'triangle', 784, 0.18, 0.14, undefined, 0.09);
        break;
      case 'victory':
        this.tone(bus, 'triangle', 392, 0.14, 0.16);
        this.tone(bus, 'triangle', 493.88, 0.14, 0.16, undefined, 0.12);
        this.tone(bus, 'triangle', 587.33, 0.14, 0.16, undefined, 0.24);
        this.tone(bus, 'triangle', 784, 0.3, 0.18, undefined, 0.36);
        break;
      case 'defeat':
        this.tone(bus, 'sawtooth', 330, 0.7, 0.14, 165);
        this.tone(bus, 'sine', 82, 0.8, 0.2, 41);
        this.noise(bus, 0.5, 0.1, 'lowpass', 240, 120);
        break;
      case 'warn':
        this.tone(bus, 'triangle', 1180, 0.05, 0.08, 1040);
        break;
      case 'death':
        this.noise(bus, 0.18, 0.24, 'bandpass', 1000, 300, 2);
        this.tone(bus, 'sine', 110, 0.16, 0.24, 55);
        break;
    }
  }
}

export const audio = new AudioManager();
