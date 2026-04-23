/**
 * Utilities for audio processing.
 */

/**
 * Converts a Float32Array to 16-bit PCM (Int16Array).
 */
export function float32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const buf = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buf;
}

/**
 * Converts 16-bit PCM (Int16Array or ArrayBuffer) to Float32Array.
 */
export function int16ToFloat32(buffer: Int16Array | ArrayBuffer): Float32Array {
  const int16 = buffer instanceof ArrayBuffer ? new Int16Array(buffer) : buffer;
  const fl32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    fl32[i] = int16[i] / 32768.0;
  }
  return fl32;
}

/**
 * Encodes an Int16Array to a base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Decodes a base64 string to an ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
