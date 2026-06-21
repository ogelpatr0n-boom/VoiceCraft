// Module-level store for AudioBuffers (not serializable, so not in Zustand)
const buffers = new Map<string, AudioBuffer>();

export const audioBufferStore = {
  set(id: string, buf: AudioBuffer) { buffers.set(id, buf); },
  get(id: string) { return buffers.get(id); },
  has(id: string) { return buffers.has(id); },
  delete(id: string) { buffers.delete(id); },
  clear() { buffers.clear(); },
};

export async function decodeAudioFile(file: File): Promise<{ buffer: AudioBuffer; id: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  const id = crypto.randomUUID();
  audioBufferStore.set(id, buffer);
  return { buffer, id };
}
