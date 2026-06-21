export async function decodeAudioFile(file: File, ctx: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export function audioBufferToFloat32(buffer: AudioBuffer): Float32Array {
  // Mix down to mono if stereo
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const length = buffer.length;
  const mixed = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mixed[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return mixed;
}

export function float32ToAudioBuffer(data: Float32Array, sampleRate: number, ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, data.length, sampleRate);
  buffer.getChannelData(0).set(data);
  return buffer;
}
