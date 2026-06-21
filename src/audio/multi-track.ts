export interface Track {
  id: string;
  name: string;
  buffer: AudioBuffer | null;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  color: string;
}

export class MultiTrackManager {
  private ctx: AudioContext;
  private tracks: Map<string, Track> = new Map();
  private trackNodes: Map<string, { source: AudioBufferSourceNode | null; gain: GainNode; pan: StereoPannerNode }> = new Map();
  private masterGain: GainNode;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.connect(ctx.destination);
  }

  createTrack(name: string, color = '#00d4ff'): Track {
    const id = crypto.randomUUID();
    const track: Track = {
      id,
      name,
      buffer: null,
      gain: 1,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      color,
    };
    this.tracks.set(id, track);

    // Create audio nodes
    const gainNode = this.ctx.createGain();
    const panNode = this.ctx.createStereoPanner();
    gainNode.connect(panNode);
    panNode.connect(this.masterGain);

    this.trackNodes.set(id, { source: null, gain: gainNode, pan: panNode });
    return track;
  }

  setTrackBuffer(id: string, buffer: AudioBuffer): void {
    const track = this.tracks.get(id);
    if (track) track.buffer = buffer;
  }

  setTrackGain(id: string, gain: number): void {
    const track = this.tracks.get(id);
    const nodes = this.trackNodes.get(id);
    if (track && nodes) {
      track.gain = gain;
      nodes.gain.gain.value = gain;
    }
  }

  setTrackPan(id: string, pan: number): void {
    const track = this.tracks.get(id);
    const nodes = this.trackNodes.get(id);
    if (track && nodes) {
      track.pan = pan;
      nodes.pan.pan.value = pan;
    }
  }

  setTrackMute(id: string, muted: boolean): void {
    const track = this.tracks.get(id);
    const nodes = this.trackNodes.get(id);
    if (track && nodes) {
      track.muted = muted;
      nodes.gain.gain.value = muted ? 0 : track.gain;
    }
  }

  setTrackSolo(id: string, solo: boolean): void {
    const track = this.tracks.get(id);
    if (track) {
      track.solo = solo;
      this.updateSoloState();
    }
  }

  private updateSoloState(): void {
    const anySolo = Array.from(this.tracks.values()).some(t => t.solo);
    for (const [id, track] of this.tracks) {
      const nodes = this.trackNodes.get(id);
      if (nodes) {
        if (anySolo) {
          nodes.gain.gain.value = track.solo ? track.gain : 0;
        } else {
          nodes.gain.gain.value = track.muted ? 0 : track.gain;
        }
      }
    }
  }

  play(offset = 0): void {
    if (this.isPlaying) this.stop();

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime;
    this.pauseOffset = offset;

    for (const [id, track] of this.tracks) {
      if (!track.buffer || track.muted) continue;
      const nodes = this.trackNodes.get(id);
      if (!nodes) continue;

      const source = this.ctx.createBufferSource();
      source.buffer = track.buffer;
      source.connect(nodes.gain);
      source.start(0, offset);
      nodes.source = source;
    }
  }

  stop(): void {
    this.isPlaying = false;
    for (const [, nodes] of this.trackNodes) {
      try { nodes.source?.stop(); } catch {}
      nodes.source = null;
    }
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pauseOffset += this.ctx.currentTime - this.startTime;
    this.stop();
  }

  getCurrentTime(): number {
    if (this.isPlaying) {
      return this.pauseOffset + (this.ctx.currentTime - this.startTime);
    }
    return this.pauseOffset;
  }

  getTracks(): Track[] {
    return Array.from(this.tracks.values());
  }

  getTrack(id: string): Track | undefined {
    return this.tracks.get(id);
  }

  removeTrack(id: string): void {
    const nodes = this.trackNodes.get(id);
    if (nodes) {
      try { nodes.source?.stop(); } catch {}
      nodes.gain.disconnect();
      nodes.pan.disconnect();
    }
    this.tracks.delete(id);
    this.trackNodes.delete(id);
  }

  setMasterGain(value: number): void {
    this.masterGain.gain.value = value;
  }

  getMasterNode(): GainNode {
    return this.masterGain;
  }
}
