// Web MIDI API handler for hardware MIDI keyboard support
/// <reference path="../../types/webmidi.d.ts" />

export interface MidiInputCallbacks {
  onNoteOn?: (pitch: number, velocity: number, channel: number) => void;
  onNoteOff?: (pitch: number, velocity: number, channel: number) => void;
  onControlChange?: (controller: number, value: number, channel: number) => void;
  onPitchBend?: (value: number, channel: number) => void;
  onDeviceConnected?: (device: MIDIInput) => void;
  onDeviceDisconnected?: (device: MIDIInput) => void;
}

class MidiInputManager {
  private midiAccess: MIDIAccess | null = null;
  private inputs: Map<string, MIDIInput> = new Map();
  private callbacks: MidiInputCallbacks = {};
  private isSupported = false;
  private isEnabled = false;

  constructor() {
    this.isSupported = 'requestMIDIAccess' in navigator;
  }

  async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Web MIDI API not supported in this browser');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.setupInputs();
      this.midiAccess.onstatechange = this.handleStateChange.bind(this);
      this.isEnabled = true;
      return true;
    } catch (err) {
      console.error('Failed to get MIDI access:', err);
      return false;
    }
  }

  setCallbacks(callbacks: MidiInputCallbacks): void {
    this.callbacks = callbacks;
  }

  private setupInputs(): void {
    if (!this.midiAccess) return;

    this.inputs.clear();
    for (const input of this.midiAccess.inputs.values()) {
      this.connectInput(input);
    }
  }

  private connectInput(input: MIDIInput): void {
    if (this.inputs.has(input.id)) return;

    input.onmidimessage = this.handleMidiMessage.bind(this);
    this.inputs.set(input.id, input);
    this.callbacks.onDeviceConnected?.(input);
  }

  private disconnectInput(input: MIDIInput): void {
    if (!this.inputs.has(input.id)) return;

    input.onmidimessage = null;
    this.inputs.delete(input.id);
    this.callbacks.onDeviceDisconnected?.(input);
  }

  private handleStateChange(event: MIDIConnectionEvent): void {
    const device = event.port;
    if (!device || device.type !== 'input') return;

    if (device.state === 'connected') {
      this.connectInput(device as MIDIInput);
    } else if (device.state === 'disconnected') {
      this.disconnectInput(device as MIDIInput);
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 1) return;

    const status = data[0];
    const channel = status & 0x0f;
    const messageType = status >> 4;

    switch (messageType) {
      case 0x9: // Note On
        if (data.length >= 3) {
          const pitch = data[1];
          const velocity = data[2];
          if (velocity > 0) {
            this.callbacks.onNoteOn?.(pitch, velocity, channel);
          } else {
            // Note On with velocity 0 is equivalent to Note Off
            this.callbacks.onNoteOff?.(pitch, 0, channel);
          }
        }
        break;

      case 0x8: // Note Off
        if (data.length >= 3) {
          const pitch = data[1];
          const velocity = data[2];
          this.callbacks.onNoteOff?.(pitch, velocity, channel);
        }
        break;

      case 0xb: // Control Change
        if (data.length >= 3) {
          const controller = data[1];
          const value = data[2];
          this.callbacks.onControlChange?.(controller, value, channel);
        }
        break;

      case 0xe: // Pitch Bend
        if (data.length >= 3) {
          const lsb = data[1];
          const msb = data[2];
          const value = ((msb << 7) | lsb) - 8192; // Center at 0
          this.callbacks.onPitchBend?.(value, channel);
        }
        break;
    }
  }

  getInputs(): MIDIInput[] {
    return Array.from(this.inputs.values());
  }

  getInputNames(): string[] {
    return this.getInputs().map(input => input.name || input.id);
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  isConnected(): boolean {
    return this.isEnabled && this.inputs.size > 0;
  }

  dispose(): void {
    for (const input of this.inputs.values()) {
      input.onmidimessage = null;
    }
    this.inputs.clear();
    this.midiAccess = null;
    this.isEnabled = false;
  }
}

// Singleton instance
export const midiInput = new MidiInputManager();
