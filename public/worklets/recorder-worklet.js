// Recorder AudioWorklet Processor
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.buffers = [];

    this.port.onmessage = (e) => {
      if (e.data.type === 'start') {
        this.recording = true;
        this.buffers = [];
      } else if (e.data.type === 'stop') {
        this.recording = false;
        // Send all recorded data back
        this.port.postMessage({ type: 'data', buffers: this.buffers });
        this.buffers = [];
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || !this.recording) return true;

    // Copy the input data
    const channelData = new Float32Array(input[0].length);
    channelData.set(input[0]);
    this.buffers.push(channelData);

    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
