import { float32ToInt16, int16ToFloat32, arrayBufferToBase64, base64ToArrayBuffer } from './audio-utils';

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private scheduledTime: number = 0;
  private isRecording: boolean = false;
  private analyser: AnalyserNode | null = null;

  constructor(private onAudioData: (base64: string) => void) {}

  async start() {
    if (this.isRecording) return;

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // ScriptProcessor is deprecated but works reliably for our needs without complex worklet setup
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    this.source.connect(this.analyser);
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToInt16(inputData);
      const base64 = arrayBufferToBase64(pcm16.buffer);
      this.onAudioData(base64);
    };

    this.isRecording = true;
    this.scheduledTime = this.audioContext.currentTime;
  }

  stop() {
    this.isRecording = false;
    this.stream?.getTracks().forEach(track => track.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
    this.audioContext?.close();
    this.audioContext = null;
  }

  playAudioChunk(base64: string) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }

    const arrayBuffer = base64ToArrayBuffer(base64);
    const float32Data = int16ToFloat32(arrayBuffer);
    
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const startTime = Math.max(this.audioContext.currentTime, this.scheduledTime);
    source.start(startTime);
    this.scheduledTime = startTime + audioBuffer.duration;
  }

  clearPlayback() {
    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
      // Note: Truly stopping currently playing clips is harder without keeping track of all sources
      // but resetting scheduledTime prevents new clips from being queued behind the interrupted ones.
      // In a more robust version, we'd maintain a set of active sources.
    }
  }

  getVolume() {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average / 128; // Normalize to 0-1 approx
  }
}
