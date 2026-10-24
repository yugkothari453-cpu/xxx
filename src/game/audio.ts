class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  constructor() {
    // Read user mute preference from localStorage
    try {
      const saved = localStorage.getItem('royal_gambit_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('royal_gambit_muted', String(muted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;
      this.ctx = new AudioCtxClass();

      // Master compressor to prevent any clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(40, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public playPawnMove(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    // Royal Indian bronze ghungroo / singing bell chime (D5 & A5 harmonic)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);

    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(1174.66, t); // D6
    oscHarmonic.frequency.exponentialRampToValueAtTime(1760, t + 0.04);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(this.compressor);

    osc.start(t);
    oscHarmonic.start(t);
    osc.stop(t + 0.24);
    oscHarmonic.stop(t + 0.24);
  }

  public playWallPlacement(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;

    // 1. Deep Fort Sandstone Nagada / Pakhawaj drum bass resonance
    const oscLow = ctx.createOscillator();
    const gainLow = ctx.createGain();
    oscLow.type = 'sine';
    oscLow.frequency.setValueAtTime(160, t);
    oscLow.frequency.exponentialRampToValueAtTime(38, t + 0.28);

    gainLow.gain.setValueAtTime(0.7, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    oscLow.connect(gainLow);
    gainLow.connect(this.compressor);

    // 2. Brass stone battlement clamp chime
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = 'triangle';
    oscHigh.frequency.setValueAtTime(620, t);
    oscHigh.frequency.exponentialRampToValueAtTime(220, t + 0.16);

    gainHigh.gain.setValueAtTime(0.35, t);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    oscHigh.connect(gainHigh);
    gainHigh.connect(this.compressor);

    oscLow.start(t);
    oscLow.stop(t + 0.31);

    oscHigh.start(t);
    oscHigh.stop(t + 0.2);
  }

  public playInvalid(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.setValueAtTime(130, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playVictory(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;
    // Ascending royal fanfare arpeggio: C4 -> E4 -> G4 -> C5 -> E5
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const dur = idx === notes.length - 1 ? 0.7 : 0.22;
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.35, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.compressor!);

      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.02);
    });
  }

  public playDefeat(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;
    // Descending melancholy minor notes
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.compressor!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  public playClick(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.compressor) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.compressor);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const sound = new SoundManager();
