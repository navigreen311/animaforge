/**
 * AudioPlayerManager (AU-1)
 *
 * Singleton manager for Web Audio API playback with analyser-based
 * waveform/frequency data extraction for visualizers.
 */

type ProgressCallback = (progress: number, currentTime: number, duration: number) => void;
type EndCallback = () => void;

class AudioPlayerManager {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private currentTrackId: string | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private animationFrame: number | null = null;

  private startTime = 0;
  private onProgress: ProgressCallback | null = null;
  private onEnd: EndCallback | null = null;

  // Simple in-memory decoded buffer cache keyed by url
  private bufferCache: Map<string, AudioBuffer> = new Map();

  /** Lazily create the AudioContext on first use (must happen after user gesture). */
  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      const Ctor =
        (typeof window !== 'undefined' &&
          ((window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)) ||
        null;
      if (!Ctor) {
        throw new Error('Web Audio API is not supported in this environment');
      }
      this.audioContext = new Ctor();
    }
    return this.audioContext;
  }

  /** Fetch and decode an audio file, using the in-memory cache when possible. */
  private async loadBuffer(url: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;

    const ctx = this.ensureContext();
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    this.bufferCache.set(url, decoded);
    return decoded;
  }

  /** Start the rAF progress loop. */
  private startProgressLoop(duration: number) {
    const tick = () => {
      if (!this.audioContext || !this.currentSource) {
        this.animationFrame = null;
        return;
      }
      const elapsed = this.audioContext.currentTime - this.startTime;
      const clamped = Math.max(0, Math.min(elapsed, duration));
      const progress = duration > 0 ? clamped / duration : 0;
      if (this.onProgress) {
        this.onProgress(progress, clamped, duration);
      }
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  /** Stop the rAF progress loop. */
  private stopProgressLoop() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /** Tear down the current source without resetting context. */
  private teardownCurrentSource() {
    this.stopProgressLoop();
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
      } catch {
        // source may already be stopped
      }
      try {
        this.currentSource.disconnect();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
    this.currentBuffer = null;
    this.currentTrackId = null;
  }

  /**
   * Play an audio track. Stops any in-flight playback first.
   */
  async play(
    trackId: string,
    url: string,
    onProgress?: ProgressCallback,
    onEnd?: EndCallback
  ): Promise<void> {
    const ctx = this.ensureContext();

    // Stop whatever is currently playing first.
    this.teardownCurrentSource();

    // Resume if the context was suspended (autoplay policy).
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore – subsequent play attempt will surface the error
      }
    }

    const buffer = await this.loadBuffer(url);

    // Create graph: source -> analyser -> gain -> destination
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = 1;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(ctx.destination);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);

    this.currentSource = source;
    this.currentBuffer = buffer;
    this.currentTrackId = trackId;
    this.onProgress = onProgress ?? null;
    this.onEnd = onEnd ?? null;

    source.onended = () => {
      // Only react if this is still the active source
      if (this.currentSource === source) {
        const endedCb = this.onEnd;
        this.teardownCurrentSource();
        this.onProgress = null;
        this.onEnd = null;
        if (endedCb) endedCb();
      }
    };

    this.startTime = ctx.currentTime;
    source.start(0);
    this.startProgressLoop(buffer.duration);
  }

  /** Stop playback immediately. */
  stop(): void {
    this.teardownCurrentSource();
    this.onProgress = null;
    this.onEnd = null;
  }

  /**
   * Returns the latest frequency-domain snapshot from the analyser.
   * Returns an empty Uint8Array if nothing is wired up yet.
   */
  getWaveformData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(0);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /** Whether a given track is the current active source. */
  isPlaying(trackId: string): boolean {
    return this.currentTrackId === trackId && this.currentSource !== null;
  }

  /** Current track id, or null. */
  getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }

  /** Duration of the currently loaded buffer (seconds), or 0. */
  getDuration(): number {
    return this.currentBuffer?.duration ?? 0;
  }
}

export const audioPlayer = new AudioPlayerManager();
export type { ProgressCallback, EndCallback };
