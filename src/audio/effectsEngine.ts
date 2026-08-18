import type { AudioEffectsSettings } from './effectsTypes';
import { effectsNeedProcessing } from './effectsTypes';

type EngineNodes = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  bass: BiquadFilterNode;
  treble: BiquadFilterNode;
  dryGain: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  convolver: ConvolverNode;
  reverbWet: GainNode;
  master: GainNode;
};

/**
 * Builds a stereo impulse response that feels like a calm prayer hall:
 * soft early energy, longer tail, gentle high-frequency damping.
 */
function createMosqueImpulse(ctx: AudioContext, durationSec = 2.6, decay = 3.1): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * durationSec);
  const buffer = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const early = i < rate * 0.045 ? 0.55 * (1 - i / (rate * 0.045)) : 0;
      const envelope = Math.pow(1 - t, decay) + early * 0.35;
      // Slight channel decorrelation for width
      const noise = Math.random() * 2 - 1;
      const dither = ch === 0 ? noise : noise * 0.92 + (Math.random() * 2 - 1) * 0.08;
      // One-pole low-pass so the tail stays warm (mosque-like)
      lp = lp * 0.96 + dither * 0.04;
      data[i] = (dither * 0.35 + lp * 0.65) * envelope;
    }
  }

  return buffer;
}

/**
 * Web Audio effects chain around a single HTMLAudioElement.
 * createMediaElementSource is called at most once per element.
 */
export class AudioEffectsEngine {
  private nodes: EngineNodes | null = null;
  private mediaElement: HTMLAudioElement | null = null;
  private delayConnected = false;
  private reverbConnected = false;

  get isConnected(): boolean {
    return this.nodes !== null;
  }

  /** Resume AudioContext after a user gesture (autoplay policies). */
  async resume(): Promise<void> {
    const ctx = this.nodes?.ctx;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  /**
   * Wire the media element into the processing graph (idempotent).
   * Must be called from a user gesture the first time.
   */
  connect(audio: HTMLAudioElement): void {
    if (this.nodes && this.mediaElement === audio) return;

    if (this.nodes && this.mediaElement !== audio) {
      this.dispose();
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    const source = ctx.createMediaElementSource(audio);

    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 180;
    bass.gain.value = 0;

    const treble = ctx.createBiquadFilter();
    treble.type = 'highshelf';
    treble.frequency.value = 3200;
    treble.gain.value = 0;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.28;

    const delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0;

    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;

    const convolver = ctx.createConvolver();
    convolver.normalize = true;

    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    const master = ctx.createGain();
    master.gain.value = 1;

    // EQ dry path only — delay/reverb stay disconnected until actually used.
    // Convolution in particular keeps the CPU hot even with wet gain at 0.
    source.connect(bass);
    bass.connect(treble);
    treble.connect(dryGain);
    dryGain.connect(master);
    master.connect(ctx.destination);

    this.delayConnected = false;
    this.reverbConnected = false;
    this.nodes = {
      ctx,
      source,
      bass,
      treble,
      dryGain,
      delay,
      delayFeedback,
      delayWet,
      convolver,
      reverbWet,
      master,
    };
    this.mediaElement = audio;
  }

  apply(settings: AudioEffectsSettings): void {
    if (!this.nodes) return;

    const { bass, treble, dryGain, delayFeedback, delayWet, reverbWet, delay, convolver, master } = this.nodes;
    const active = effectsNeedProcessing(settings);

    const now = this.nodes.ctx.currentTime;
    const ramp = 0.045;

    const setDelayConnected = (on: boolean) => {
      if (on === this.delayConnected) return;
      if (on) {
        treble.connect(delay);
        delay.connect(delayFeedback);
        delayFeedback.connect(delay);
        delay.connect(delayWet);
        delayWet.connect(master);
      } else {
        try {
          delay.disconnect();
          delayFeedback.disconnect();
          delayWet.disconnect();
        } catch {
          // already disconnected
        }
      }
      this.delayConnected = on;
    };

    const setReverbConnected = (on: boolean) => {
      if (on === this.reverbConnected) return;
      if (on) {
        if (!convolver.buffer) {
          convolver.buffer = createMosqueImpulse(this.nodes!.ctx);
        }
        treble.connect(convolver);
        convolver.connect(reverbWet);
        reverbWet.connect(master);
      } else {
        try {
          convolver.disconnect();
          reverbWet.disconnect();
        } catch {
          // already disconnected
        }
      }
      this.reverbConnected = on;
    };

    if (!active) {
      bass.gain.setTargetAtTime(0, now, ramp);
      treble.gain.setTargetAtTime(0, now, ramp);
      dryGain.gain.setTargetAtTime(1, now, ramp);
      delayWet.gain.setTargetAtTime(0, now, ramp);
      delayFeedback.gain.setTargetAtTime(0, now, ramp);
      reverbWet.gain.setTargetAtTime(0, now, ramp);
      setDelayConnected(false);
      setReverbConnected(false);
      return;
    }

    bass.gain.setTargetAtTime(settings.bass, now, ramp);
    treble.gain.setTargetAtTime(settings.treble, now, ramp);

    const echo = settings.echo;
    const reverb = settings.reverb;

    // Keep dry dominant so the recitation stays intelligible
    const dry = Math.max(0.42, 1 - echo * 0.35 - reverb * 0.45);
    dryGain.gain.setTargetAtTime(dry, now, ramp);

    setDelayConnected(echo > 0.01);
    delay.delayTime.setTargetAtTime(0.22 + echo * 0.18, now, ramp);
    delayWet.gain.setTargetAtTime(echo * 0.55, now, ramp);
    delayFeedback.gain.setTargetAtTime(echo * 0.42, now, ramp);

    setReverbConnected(reverb > 0.01);
    reverbWet.gain.setTargetAtTime(reverb * 0.7, now, ramp);
  }

  dispose(): void {
    if (!this.nodes) {
      this.mediaElement = null;
      return;
    }

    const { ctx, source, bass, treble, dryGain, delay, delayFeedback, delayWet, convolver, reverbWet, master } =
      this.nodes;

    try {
      source.disconnect();
      bass.disconnect();
      treble.disconnect();
      dryGain.disconnect();
      delay.disconnect();
      delayFeedback.disconnect();
      delayWet.disconnect();
      convolver.disconnect();
      reverbWet.disconnect();
      master.disconnect();
    } catch {
      // Nodes may already be disconnected
    }

    void ctx.close();
    this.nodes = null;
    this.mediaElement = null;
    this.delayConnected = false;
    this.reverbConnected = false;
  }
}
