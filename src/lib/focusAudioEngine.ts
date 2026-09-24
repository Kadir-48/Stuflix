import { SoundItem, SoundPreset, SoundCategory } from '../types';

export const FOCUS_SOUNDS: SoundItem[] = [
  // 🌧 Nature
  {
    id: 'rain',
    title: 'Rain',
    category: 'nature',
    icon: '🌧',
    description: 'Gentle steady rainfall on windowpane',
    recommendedSubject: 'Reading',
  },
  {
    id: 'heavy_rain',
    title: 'Heavy Rain',
    category: 'nature',
    icon: '⛈',
    description: 'Intense rain downpour with low rumble',
    recommendedSubject: 'Physics',
  },
  {
    id: 'thunderstorm',
    title: 'Thunderstorm',
    category: 'nature',
    icon: '⚡',
    description: 'Rolling distant thunder & heavy showers',
    recommendedSubject: 'Problem Solving',
  },
  {
    id: 'forest',
    title: 'Forest',
    category: 'nature',
    icon: '🌲',
    description: 'Breeze through pine trees with gentle birds',
    recommendedSubject: 'Biology',
  },
  {
    id: 'river',
    title: 'River',
    category: 'nature',
    icon: '🌊',
    description: 'Soothing mountain freshwater stream',
    recommendedSubject: 'Geography',
  },
  {
    id: 'ocean_waves',
    title: 'Ocean Waves',
    category: 'nature',
    icon: '🏖',
    description: 'Rhythmic shoreline swells and surf',
    recommendedSubject: 'Literature',
  },
  {
    id: 'wind',
    title: 'Wind',
    category: 'nature',
    icon: '🍃',
    description: 'Smooth calming wind across open hills',
    recommendedSubject: 'History',
  },

  // ☕ Ambient
  {
    id: 'coffee_shop',
    title: 'Coffee Shop',
    category: 'ambient',
    icon: '☕',
    description: 'Warm cafe murmur, espresso, and cup clinks',
    recommendedSubject: 'Creative Writing',
  },
  {
    id: 'library_ambience',
    title: 'Library Ambience',
    category: 'ambient',
    icon: '📚',
    description: 'Quiet room tone, soft page turns & keyboard',
    recommendedSubject: 'Writing',
  },
  {
    id: 'classroom_ambience',
    title: 'Classroom Ambience',
    category: 'ambient',
    icon: '🏫',
    description: 'Subtle study hall acoustic environment',
    recommendedSubject: 'Exam Prep',
  },
  {
    id: 'study_room_ambience',
    title: 'Study Room Ambience',
    category: 'ambient',
    icon: '🕯',
    description: 'Pure peaceful private study sanctuary',
    recommendedSubject: 'Past Papers',
  },

  // 🎵 Music
  {
    id: 'lofi_beats',
    title: 'Lo-fi Beats',
    category: 'music',
    icon: '🎧',
    description: 'Mellow electric piano chords with vinyl warmth',
    recommendedSubject: 'Computer Science',
  },
  {
    id: 'piano_focus',
    title: 'Piano Focus',
    category: 'music',
    icon: '🎹',
    description: 'Gentle neoclassical piano reflections',
    recommendedSubject: 'Mathematics',
  },
  {
    id: 'instrumental_study',
    title: 'Instrumental Study Music',
    category: 'music',
    icon: '🎻',
    description: 'Warm harmonic strings and acoustic pads',
    recommendedSubject: 'Chemistry',
  },
  {
    id: 'soft_jazz',
    title: 'Soft Jazz',
    category: 'music',
    icon: '🎷',
    description: 'Calm mellow jazz chord progressions',
    recommendedSubject: 'Economics',
  },
  {
    id: 'ambient_electronic',
    title: 'Ambient Electronic',
    category: 'music',
    icon: '🌌',
    description: 'Deep spatial synthesizer soundscapes',
    recommendedSubject: 'Coding',
  },

  // 🧠 Focus Sounds
  {
    id: 'brown_noise',
    title: 'Brown Noise',
    category: 'focus',
    icon: '🤎',
    description: 'Deep 1/f² noise for ADHD & deep concentration',
    recommendedSubject: 'Math',
  },
  {
    id: 'white_noise',
    title: 'White Noise',
    category: 'focus',
    icon: '⚪',
    description: 'Crisp uniform sound masking for distractions',
    recommendedSubject: 'Revision',
  },
  {
    id: 'pink_noise',
    title: 'Pink Noise',
    category: 'focus',
    icon: '🌸',
    description: 'Balanced natural 1/f noise for memorization',
    recommendedSubject: 'Flashcards',
  },
  {
    id: 'deep_focus_noise',
    title: 'Deep Focus Noise',
    category: 'focus',
    icon: '🧠',
    description: '40Hz gamma resonance & isochronic tone',
    recommendedSubject: 'Coding',
  },
];

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'preset_rainy_cafe',
    name: 'Rainy Cafe',
    icon: '☕',
    description: 'Coffee shop warmth layered with gentle rain outside',
    sounds: [
      { soundId: 'rain', volume: 60 },
      { soundId: 'coffee_shop', volume: 45 },
    ],
  },
  {
    id: 'preset_deep_focus',
    name: 'Deep Focus Cave',
    icon: '🧠',
    description: 'Brown noise and thunderstorm for zero distractions',
    sounds: [
      { soundId: 'brown_noise', volume: 70 },
      { soundId: 'thunderstorm', volume: 40 },
    ],
  },
  {
    id: 'preset_night_library',
    name: 'Night Library',
    icon: '📚',
    description: 'Quiet library air with distant piano reflections',
    sounds: [
      { soundId: 'library_ambience', volume: 65 },
      { soundId: 'piano_focus', volume: 40 },
    ],
  },
  {
    id: 'preset_lofi_rain',
    name: 'Lo-fi & Rain',
    icon: '🎧',
    description: 'Chill lo-fi study beats under steady rainfall',
    sounds: [
      { soundId: 'lofi_beats', volume: 60 },
      { soundId: 'rain', volume: 45 },
    ],
  },
];

// ---------------------------------------------------------------------------
// WEB AUDIO SYNTHESIS ENGINE (100% Offline, Zero Bandwidth, No Latency)
// ---------------------------------------------------------------------------

interface ActiveChannel {
  gainNode: GainNode;
  nodes: (AudioNode | number)[];
  cleanup: () => void;
}

class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeChannels: Map<string, ActiveChannel> = new Map();
  private isMuted: boolean = false;
  private masterVolume: number = 0.7; // 0.0 - 1.0

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isSoundPlaying(soundId: string): boolean {
    return this.activeChannels.has(soundId);
  }

  public setSoundVolume(soundId: string, volume: number) {
    const channel = this.activeChannels.get(soundId);
    if (channel && this.ctx) {
      const vol = Math.max(0, Math.min(1, volume));
      channel.gainNode.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public stopSound(soundId: string) {
    const channel = this.activeChannels.get(soundId);
    if (channel && this.ctx) {
      channel.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      setTimeout(() => {
        try {
          channel.cleanup();
        } catch {}
        this.activeChannels.delete(soundId);
      }, 100);
    }
  }

  public stopAll() {
    for (const [soundId] of this.activeChannels) {
      this.stopSound(soundId);
    }
  }

  public playSound(soundId: string, volume: number = 0.7) {
    if (this.activeChannels.has(soundId)) {
      this.setSoundVolume(soundId, volume);
      return;
    }

    const ctx = this.getContext();
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(0.01, ctx.currentTime);
    soundGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.15);
    soundGain.connect(this.masterGain!);

    let cleanup = () => {};

    try {
      switch (soundId) {
        case 'brown_noise':
          cleanup = this.createBrownNoise(ctx, soundGain);
          break;
        case 'pink_noise':
          cleanup = this.createPinkNoise(ctx, soundGain);
          break;
        case 'white_noise':
          cleanup = this.createWhiteNoise(ctx, soundGain);
          break;
        case 'deep_focus_noise':
          cleanup = this.createDeepFocusNoise(ctx, soundGain);
          break;
        case 'rain':
          cleanup = this.createRainSound(ctx, soundGain, false);
          break;
        case 'heavy_rain':
          cleanup = this.createRainSound(ctx, soundGain, true);
          break;
        case 'thunderstorm':
          cleanup = this.createThunderstormSound(ctx, soundGain);
          break;
        case 'ocean_waves':
          cleanup = this.createOceanWavesSound(ctx, soundGain);
          break;
        case 'forest':
          cleanup = this.createForestSound(ctx, soundGain);
          break;
        case 'river':
          cleanup = this.createRiverSound(ctx, soundGain);
          break;
        case 'wind':
          cleanup = this.createWindSound(ctx, soundGain);
          break;
        case 'coffee_shop':
          cleanup = this.createCoffeeShopSound(ctx, soundGain);
          break;
        case 'library_ambience':
          cleanup = this.createLibrarySound(ctx, soundGain);
          break;
        case 'classroom_ambience':
          cleanup = this.createClassroomSound(ctx, soundGain);
          break;
        case 'study_room_ambience':
          cleanup = this.createStudyRoomSound(ctx, soundGain);
          break;
        case 'lofi_beats':
          cleanup = this.createLofiBeatsSound(ctx, soundGain);
          break;
        case 'piano_focus':
          cleanup = this.createPianoFocusSound(ctx, soundGain);
          break;
        case 'instrumental_study':
          cleanup = this.createInstrumentalSound(ctx, soundGain);
          break;
        case 'soft_jazz':
          cleanup = this.createSoftJazzSound(ctx, soundGain);
          break;
        case 'ambient_electronic':
          cleanup = this.createAmbientElectronicSound(ctx, soundGain);
          break;
        default:
          cleanup = this.createBrownNoise(ctx, soundGain);
          break;
      }
    } catch (err) {
      console.error(`Failed to generate focus sound ${soundId}:`, err);
    }

    this.activeChannels.set(soundId, {
      gainNode: soundGain,
      nodes: [],
      cleanup,
    });
  }

  // ----------------- NOISE SYNTHESIS HELPERS -----------------

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds: number = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createWhiteNoise(ctx: AudioContext, target: AudioNode): () => void {
    const buffer = this.createWhiteNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 8000;

    source.connect(filter);
    filter.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  private createBrownNoise(ctx: AudioContext, target: AudioNode): () => void {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;

    source.connect(filter);
    filter.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  private createPinkNoise(ctx: AudioContext, target: AudioNode): () => void {
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3200;

    source.connect(filter);
    filter.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  private createDeepFocusNoise(ctx: AudioContext, target: AudioNode): () => void {
    // 40Hz Isochronic tone with sub-bass drone + gentle brown noise
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 136.1; // OM tone frequency

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 176.1; // 40Hz gamma difference

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.15;

    osc1.connect(droneGain);
    osc2.connect(droneGain);

    const brownCleanup = this.createBrownNoise(ctx, target);
    droneGain.connect(target);

    osc1.start();
    osc2.start();

    return () => {
      brownCleanup();
      try {
        osc1.stop();
        osc2.stop();
      } catch {}
    };
  }

  private createRainSound(ctx: AudioContext, target: AudioNode, isHeavy: boolean): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = isHeavy ? 1800 : 3400;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = isHeavy ? 80 : 300;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }

  private createThunderstormSound(ctx: AudioContext, target: AudioNode): () => void {
    const rainCleanup = this.createRainSound(ctx, target, true);

    // Periodic thunder rumble simulator
    const timer = setInterval(() => {
      if (Math.random() > 0.4 && ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(55, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 2.5);

        rumbleGain.gain.setValueAtTime(0.01, ctx.currentTime);
        rumbleGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.3);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);

        osc.connect(rumbleGain);
        rumbleGain.connect(target);

        osc.start();
        osc.stop(ctx.currentTime + 3.2);
      }
    }, 7000);

    return () => {
      rainCleanup();
      clearInterval(timer);
    };
  }

  private createOceanWavesSound(ctx: AudioContext, target: AudioNode): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 6);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    // LFO for wave swelling
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // ~8 second swell

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(target);

    source.start();
    lfo.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
      } catch {}
    };
  }

  private createForestSound(ctx: AudioContext, target: AudioNode): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 0.8;

    source.connect(filter);
    filter.connect(target);
    source.start();

    // Occasional gentle bird chirps
    const chirpTimer = setInterval(() => {
      if (Math.random() > 0.45 && ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const chirpGain = ctx.createGain();
        osc.type = 'sine';
        const startFreq = 2400 + Math.random() * 800;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(startFreq + 600, ctx.currentTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(startFreq - 200, ctx.currentTime + 0.18);

        chirpGain.gain.setValueAtTime(0.01, ctx.currentTime);
        chirpGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03);
        chirpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(chirpGain);
        chirpGain.connect(target);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    }, 3500);

    return () => {
      try {
        source.stop();
      } catch {}
      clearInterval(chirpTimer);
    };
  }

  private createRiverSound(ctx: AudioContext, target: AudioNode): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 850;
    bp.Q.value = 1.2;

    source.connect(bp);
    bp.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
      } catch {}
    };
  }

  private createWindSound(ctx: AudioContext, target: AudioNode): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 5);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = 2.0;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(target);

    source.start();
    lfo.start();

    return () => {
      try {
        source.stop();
        lfo.stop();
      } catch {}
    };
  }

  private createCoffeeShopSound(ctx: AudioContext, target: AudioNode): () => void {
    // Filtered chatter murmur + clinks
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 480;
    filter.Q.value = 1.5;

    source.connect(filter);
    filter.connect(target);
    source.start();

    // Occasional cup clink resonance
    const clinkTimer = setInterval(() => {
      if (Math.random() > 0.5 && ctx.state === 'running') {
        const osc = ctx.createOscillator();
        const clinkGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 3200 + Math.random() * 1200;

        clinkGain.gain.setValueAtTime(0.001, ctx.currentTime);
        clinkGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
        clinkGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

        osc.connect(clinkGain);
        clinkGain.connect(target);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    }, 4000);

    return () => {
      try {
        source.stop();
      } catch {}
      clearInterval(clinkTimer);
    };
  }

  private createLibrarySound(ctx: AudioContext, target: AudioNode): () => void {
    // Room air tone
    const brownBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = brownBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;

    source.connect(filter);
    filter.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
      } catch {}
    };
  }

  private createClassroomSound(ctx: AudioContext, target: AudioNode): () => void {
    const whiteBuffer = this.createWhiteNoiseBuffer(ctx, 4);
    const source = ctx.createBufferSource();
    source.buffer = whiteBuffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;
    filter.Q.value = 0.9;

    source.connect(filter);
    filter.connect(target);
    source.start();

    return () => {
      try {
        source.stop();
      } catch {}
    };
  }

  private createStudyRoomSound(ctx: AudioContext, target: AudioNode): () => void {
    // Ultra subtle warm acoustic drone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 65.4; // C2

    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(target);
    osc.start();

    return () => {
      try {
        osc.stop();
      } catch {}
    };
  }

  // ----------------- MUSIC SYNTHESIS HELPERS -----------------

  private createLofiBeatsSound(ctx: AudioContext, target: AudioNode): () => void {
    // Warm Rhodes-like chord progression (Cmaj7 -> Am7 -> Dm7 -> G7)
    const chordFreqs = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];
    let chordIdx = 0;

    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      const freqs = chordFreqs[chordIdx % chordFreqs.length];
      chordIdx++;

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;

        noteGain.gain.setValueAtTime(0.001, ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(target);

        osc.start();
        osc.stop(ctx.currentTime + 3.0);
      });
    }, 3200);

    return () => {
      clearInterval(interval);
    };
  }

  private createPianoFocusSound(ctx: AudioContext, target: AudioNode): () => void {
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // C major pentatonic
    let step = 0;

    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      const freq = notes[step % notes.length];
      step = (step + 1 + Math.floor(Math.random() * 2)) % notes.length;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(target);

      osc.start();
      osc.stop(ctx.currentTime + 2.0);
    }, 1800);

    return () => {
      clearInterval(interval);
    };
  }

  private createInstrumentalSound(ctx: AudioContext, target: AudioNode): () => void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const padGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 130.81; // C3
    osc2.type = 'triangle';
    osc2.frequency.value = 196.0;  // G3

    filter.type = 'lowpass';
    filter.frequency.value = 420;

    padGain.gain.value = 0.05;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(padGain);
    padGain.connect(target);

    osc1.start();
    osc2.start();

    return () => {
      try {
        osc1.stop();
        osc2.stop();
      } catch {}
    };
  }

  private createSoftJazzSound(ctx: AudioContext, target: AudioNode): () => void {
    const chords = [
      [220.0, 277.18, 329.63, 415.3], // Amaj7
      [185.0, 233.08, 277.18, 349.23], // F#m7
      [246.94, 311.13, 369.99, 440.0], // Bm7
      [164.81, 207.65, 246.94, 293.66], // E7
    ];
    let idx = 0;

    const interval = setInterval(() => {
      if (ctx.state !== 'running') return;
      const freqs = chords[idx % chords.length];
      idx++;

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        noteGain.gain.setValueAtTime(0.001, ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.15);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.2);

        osc.connect(noteGain);
        noteGain.connect(target);

        osc.start();
        osc.stop(ctx.currentTime + 3.5);
      });
    }, 3600);

    return () => {
      clearInterval(interval);
    };
  }

  private createAmbientElectronicSound(ctx: AudioContext, target: AudioNode): () => void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110.0; // A2

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.value = 0.08;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(target);

    osc.start();
    lfo.start();

    return () => {
      try {
        osc.stop();
        lfo.stop();
      } catch {}
    };
  }
}

export const focusAudio = new FocusAudioEngine();

// ---------------------------------------------------------------------------
// NOTIFICATION CHIME (Timer completion / alerts)
// ---------------------------------------------------------------------------

export function playNotificationChime(volume: number = 0.5) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Dual-tone ascending chime (C6 -> G6 harmonic chime)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1046.5, now, 0.6);        // C6
    playTone(1567.98, now + 0.14, 0.9); // G6
    playTone(2093.0, now + 0.28, 1.2);  // C7 shimmer
  } catch (e) {
    // AudioContext autoplay restrictions handled
  }
}
