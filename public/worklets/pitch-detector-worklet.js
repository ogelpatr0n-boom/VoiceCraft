// Pitch Detector AudioWorklet Processor
// Uses the YIN algorithm for pitch detection
class PitchDetectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.hopSize = 512;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.threshold = 0.15;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex] = channelData[i];
      this.bufferIndex++;

      if (this.bufferIndex >= this.bufferSize) {
        this.detectPitch();
        // Shift by hop size
        this.buffer.copyWithin(0, this.hopSize);
        this.bufferIndex = this.bufferSize - this.hopSize;
      }
    }

    return true;
  }

  detectPitch() {
    const buffer = this.buffer;
    const halfLen = Math.floor(buffer.length / 2);
    const yinBuffer = new Float32Array(halfLen);

    // Check signal level
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.01) {
      this.port.postMessage({ type: 'pitch', frequency: 0, clarity: 0 });
      return;
    }

    // Difference function
    for (let tau = 0; tau < halfLen; tau++) {
      let sum = 0;
      for (let i = 0; i < halfLen; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    // Absolute threshold
    let tauEstimate = -1;
    for (let tau = 2; tau < halfLen; tau++) {
      if (yinBuffer[tau] < this.threshold) {
        while (tau + 1 < halfLen && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      this.port.postMessage({ type: 'pitch', frequency: 0, clarity: 0 });
      return;
    }

    // Parabolic interpolation
    const s0 = tauEstimate > 0 ? yinBuffer[tauEstimate - 1] : yinBuffer[tauEstimate];
    const s1 = yinBuffer[tauEstimate];
    const s2 = tauEstimate + 1 < halfLen ? yinBuffer[tauEstimate + 1] : yinBuffer[tauEstimate];

    let betterTau = tauEstimate;
    const denom = 2 * s1 - s2 - s0;
    if (denom !== 0) {
      betterTau = tauEstimate + (s2 - s0) / (2 * denom);
    }

    const frequency = sampleRate / betterTau;
    const clarity = 1 - s1;

    this.port.postMessage({ type: 'pitch', frequency, clarity });
  }
}

registerProcessor('pitch-detector-processor', PitchDetectorProcessor);
