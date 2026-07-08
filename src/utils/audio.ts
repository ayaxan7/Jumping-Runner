/**
 * All audio is synthesized with the Web Audio API at runtime, so the
 * project ships zero binary assets and zero licensing concerns.
 *
 * - SFX: short oscillator envelopes (jump blip, thud, chime, jingle).
 * - Music: a light generative chiptune loop scheduled ahead of time.
 */

import { bus } from './eventBus';
import { loadMuted, saveMuted } from './scoring';

type SfxName = 'jump' | 'collision' | 'milestone' | 'gameover' | 'countdown' | 'calibrated' | 'collect';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = loadMuted();
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;

  /** Lazily create the AudioContext — browsers require a user gesture first. */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Must be called from a user gesture (button click) to unlock audio. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMuted(muted);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
    bus.emit('audio:mute', muted);
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /* ------------------------------------------------------------------ */
  /* SFX                                                                 */
  /* ------------------------------------------------------------------ */

  private tone(
    freq: number,
    duration: number,
    options: {
      type?: OscillatorType;
      volume?: number;
      slideTo?: number;
      delay?: number;
    } = {}
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const { type = 'square', volume = 0.25, slideTo, delay = 0 } = options;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, volume = 0.3): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start();
  }

  play(name: SfxName): void {
    switch (name) {
      case 'jump':
        this.tone(330, 0.18, { slideTo: 740, volume: 0.22 });
        break;
      case 'collision':
        this.noise(0.25, 0.35);
        this.tone(160, 0.3, { type: 'sawtooth', slideTo: 60, volume: 0.3 });
        break;
      case 'milestone':
        this.tone(660, 0.09, { volume: 0.18 });
        this.tone(880, 0.12, { volume: 0.18, delay: 0.09 });
        break;
      case 'countdown':
        this.tone(520, 0.1, { type: 'triangle', volume: 0.25 });
        break;
      case 'calibrated':
        this.tone(523, 0.1, { type: 'triangle', volume: 0.22 });
        this.tone(659, 0.1, { type: 'triangle', volume: 0.22, delay: 0.1 });
        this.tone(784, 0.18, { type: 'triangle', volume: 0.22, delay: 0.2 });
        break;
      case 'collect':
        this.tone(988, 0.08, { volume: 0.18 });
        this.tone(1319, 0.14, { volume: 0.18, delay: 0.07 });
        break;
      case 'gameover':
        this.tone(440, 0.18, { type: 'triangle', volume: 0.25 });
        this.tone(349, 0.18, { type: 'triangle', volume: 0.25, delay: 0.18 });
        this.tone(262, 0.42, { type: 'triangle', volume: 0.25, delay: 0.36 });
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Background music — generative 8-step chiptune loop                  */
  /* ------------------------------------------------------------------ */

  private static BASS = [130.81, 130.81, 174.61, 174.61, 146.83, 146.83, 196.0, 196.0];
  private static LEAD = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46];

  startMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.musicTimer !== null) return;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.step = 0;
    const tempo = 0.21; // seconds per step

    const schedule = () => {
      if (!this.ctx || !this.musicGain) return;
      // Schedule notes slightly ahead so timer jitter never causes gaps.
      while (this.nextNoteTime < this.ctx.currentTime + 0.3) {
        const i = this.step % 8;
        this.scheduleNote(AudioEngine.BASS[i], this.nextNoteTime, tempo * 0.9, 'triangle', 0.5);
        if (this.step % 2 === 0) {
          this.scheduleNote(AudioEngine.LEAD[i], this.nextNoteTime, tempo * 0.55, 'square', 0.16);
        }
        this.nextNoteTime += tempo;
        this.step++;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 120);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleNote(
    freq: number,
    when: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    osc.connect(gain).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }
}

/** Singleton audio engine. */
export const audio = new AudioEngine();
