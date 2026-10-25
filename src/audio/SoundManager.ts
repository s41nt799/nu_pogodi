type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type ToneOptions = {
  type: OscillatorType;
  startFrequency: number;
  endFrequency?: number;
  durationSeconds: number;
  volume: number;
  delaySeconds?: number;
};

class SoundManager {
  private context: AudioContext | null = null;

  private master: GainNode | null = null;

  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public init(): void {
    if (this.context) return;

    const AudioContextClass: typeof AudioContext | undefined =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
    } catch {
      this.context = null;
      this.master = null;
    }
  }

  public unlock(): void {
    this.init();

    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch(() => undefined);
    }
  }

  private playTone({
    type,
    startFrequency,
    endFrequency = startFrequency,
    durationSeconds,
    volume,
    delaySeconds = 0,
  }: ToneOptions): void {
    if (this.muted) return;

    this.init();
    if (!this.context || !this.master) return;

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => undefined);
    }

    const { context, master } = this;
    const startAt = context.currentTime + delaySeconds;
    const stopAt = startAt + durationSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), stopAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }

  public playCatch(): void {
    this.playTone({
      type: 'square',
      startFrequency: 880,
      endFrequency: 1180,
      durationSeconds: 0.08,
      volume: 0.16,
    });
  }

  public playLoseLife(): void {
    this.playTone({
      type: 'sawtooth',
      startFrequency: 180,
      endFrequency: 70,
      durationSeconds: 0.32,
      volume: 0.22,
    });
  }

  public playStart(): void {
    this.playTone({
      type: 'triangle',
      startFrequency: 523.25,
      durationSeconds: 0.1,
      volume: 0.18,
    });
    this.playTone({
      type: 'triangle',
      startFrequency: 659.25,
      durationSeconds: 0.1,
      volume: 0.18,
      delaySeconds: 0.11,
    });
    this.playTone({
      type: 'triangle',
      startFrequency: 783.99,
      durationSeconds: 0.16,
      volume: 0.2,
      delaySeconds: 0.22,
    });
  }

  public playGameOver(): void {
    this.playTone({
      type: 'triangle',
      startFrequency: 392,
      durationSeconds: 0.16,
      volume: 0.16,
      delaySeconds: 0.38,
    });
    this.playTone({
      type: 'triangle',
      startFrequency: 329.63,
      durationSeconds: 0.16,
      volume: 0.16,
      delaySeconds: 0.55,
    });
    this.playTone({
      type: 'triangle',
      startFrequency: 261.63,
      endFrequency: 196,
      durationSeconds: 0.4,
      volume: 0.18,
      delaySeconds: 0.72,
    });
  }
}

export const soundManager = new SoundManager();
