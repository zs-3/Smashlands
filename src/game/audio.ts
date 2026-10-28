class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem('turbosmash_muted');
      if (saved === 'true') this.muted = true;
    } catch {
      // Ignore storage access errors in restricted iframes
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('turbosmash_muted', String(m));
    } catch {
      // Ignore
    }
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(m ? 0 : 0.035, this.ctx.currentTime, 0.05);
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public startEngineHum(): void {
    this.unlock();
    if (!this.ctx || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 58;

    filter.type = 'lowpass';
    filter.frequency.value = 220;

    gain.gain.value = this.muted ? 0 : 0.03;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();

    this.engineOsc = osc;
    this.engineGain = gain;
  }

  public updateEngineHum(speedRatio: number, boosting: boolean, paused: boolean): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (this.muted || paused) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.04);
      return;
    }
    const targetFreq = 54 + Math.min(1.4, Math.abs(speedRatio)) * 95 + (boosting ? 42 : 0);
    const targetGain = 0.022 + Math.min(1, Math.abs(speedRatio)) * 0.032;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  public stopEngineHum(): void {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // Ignore
      }
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    delay = 0,
  ): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);

    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBurst(duration: number, filterFreq: number, volume = 0.16, delay = 0): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.4);
    }

    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(80, t0 + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t0);
  }

  public playBoxPickup(): void {
    this.tone(440, 660, 0.09, 'triangle', 0.11, 0);
    this.tone(660, 880, 0.09, 'triangle', 0.11, 0.07);
    this.tone(880, 1175, 0.14, 'sine', 0.13, 0.14);
  }

  public playWeaponReady(): void {
    this.tone(784, 1046, 0.12, 'triangle', 0.12, 0);
  }

  public playRocketFire(): void {
    this.noiseBurst(0.28, 950, 0.14);
    this.tone(280, 110, 0.25, 'sawtooth', 0.09);
  }

  public playMinigunShot(): void {
    this.noiseBurst(0.055, 1600, 0.08);
    this.tone(210, 95, 0.05, 'square', 0.06);
  }

  public playMineDrop(): void {
    this.tone(520, 260, 0.1, 'sine', 0.1);
    this.tone(760, 760, 0.06, 'square', 0.07, 0.1);
  }

  public playCannonShot(): void {
    this.noiseBurst(0.18, 650, 0.16);
    this.tone(160, 52, 0.2, 'triangle', 0.15);
  }

  public playStarShield(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      this.tone(n, n * 1.06, 0.14, 'triangle', 0.1, idx * 0.055);
    });
  }

  public playBoost(): void {
    this.noiseBurst(0.24, 1200, 0.11);
    this.tone(180, 460, 0.26, 'sawtooth', 0.09);
  }

  public playExplosion(heavy = false): void {
    this.noiseBurst(heavy ? 0.48 : 0.32, heavy ? 780 : 920, heavy ? 0.24 : 0.16);
    this.tone(heavy ? 125 : 150, 32, heavy ? 0.42 : 0.28, 'sine', heavy ? 0.22 : 0.14);
  }

  public playHit(): void {
    this.tone(320, 140, 0.08, 'square', 0.09);
  }

  public playSmashFanfare(): void {
    this.playExplosion(true);
    this.tone(523.25, 523.25, 0.11, 'triangle', 0.13, 0.05);
    this.tone(659.25, 659.25, 0.11, 'triangle', 0.13, 0.14);
    this.tone(783.99, 1046.5, 0.24, 'triangle', 0.15, 0.23);
  }

  public playCelebrationPop(): void {
    this.noiseBurst(0.16, 1800, 0.09, 0.02);
    this.tone(587, 1174, 0.18, 'sine', 0.09, 0);
    this.tone(880, 1318, 0.2, 'triangle', 0.09, 0.12);
  }

  public playUiClick(): void {
    this.tone(620, 780, 0.05, 'sine', 0.06);
  }

  public playPrizeSpin(): void {
    for (let i = 0; i < 6; i++) {
      this.tone(400 + i * 95, 440 + i * 95, 0.06, 'triangle', 0.09, i * 0.065);
    }
    this.tone(1046.5, 1318.5, 0.3, 'triangle', 0.14, 0.42);
  }
}

export const sound = new SoundEngine();
