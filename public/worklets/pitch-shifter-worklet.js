// Pitch Shifter AudioWorklet Processor
// Uses simplified WSOLA (Waveform Similarity Overlap-Add) for pitch shifting
class PitchShifterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.shiftCents = 0;
    this.bufferSize = 4096;
    this.inputBuffer = new Float32Array(this.bufferSize);
    this.outputBuffer = new Float32Array(this.bufferSize);
    this.inputWritePos = 0;
    this.outputReadPos = 0;
    this.outputWritePos = 0;
    this.grainSize = 1024;
    this.overlap = 512;
    this.sampleCounter = 0;

    // Window function (Hann)
    this.window = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (this.grainSize - 1)));
    }

    this.port.onmessage = (e) => {
      if (e.data.type === 'shift') {
        this.shiftCents = e.data.cents;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const inputData = input[0];
    const outputData = output[0];

    // If no shift needed, pass through
    if (Math.abs(this.shiftCents) < 1) {
      for (let i = 0; i < outputData.length; i++) {
        outputData[i] = inputData[i];
      }
      return true;
    }

    const shiftRatio = Math.pow(2, this.shiftCents / 1200);

    // Write input to circular buffer
    for (let i = 0; i < inputData.length; i++) {
      this.inputBuffer[this.inputWritePos % this.bufferSize] = inputData[i];
      this.inputWritePos++;
    }

    // Generate output using granular resynthesis
    for (let i = 0; i < outputData.length; i++) {
      this.sampleCounter++;

      // Trigger a new grain at overlap intervals
      if (this.sampleCounter >= this.overlap) {
        this.sampleCounter = 0;
        this.synthesizeGrain(shiftRatio);
      }

      // Read from output buffer
      const idx = this.outputReadPos % this.bufferSize;
      outputData[i] = this.outputBuffer[idx];
      this.outputBuffer[idx] = 0; // Clear after reading
      this.outputReadPos++;
    }

    return true;
  }

  synthesizeGrain(shiftRatio) {
    // Read position in input buffer adjusted by shift ratio
    const readStart = this.inputWritePos - this.grainSize * 2;

    for (let i = 0; i < this.grainSize; i++) {
      // Resample position
      const resamplePos = readStart + i * shiftRatio;
      const intPos = Math.floor(resamplePos);
      const frac = resamplePos - intPos;

      // Linear interpolation from input buffer
      const idx0 = ((intPos % this.bufferSize) + this.bufferSize) % this.bufferSize;
      const idx1 = ((intPos + 1) % this.bufferSize + this.bufferSize) % this.bufferSize;
      const sample = this.inputBuffer[idx0] * (1 - frac) + this.inputBuffer[idx1] * frac;

      // Apply window and add to output buffer
      const outIdx = (this.outputReadPos + i) % this.bufferSize;
      this.outputBuffer[outIdx] += sample * this.window[i] * 0.5;
    }
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
