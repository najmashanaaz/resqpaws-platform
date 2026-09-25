import crypto from 'node:crypto';
import { ApiError } from '../utils/apiError.js';

const corrupted = () =>
  new ApiError(422, 'This audio file looks corrupted or incomplete. Please record again or choose another file.', 'CORRUPTED_AUDIO');

/** Identify the real format from the first bytes, not from the file name. */
export function detectAudioType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') return 'wav';
  if (buf.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'mp3';
  return null;
}

/** Read the WAV header. Supports 16-bit PCM (what the ResQPaws app produces). */
export function parseWav(buf) {
  if (buf.length < 44) throw corrupted();
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      if (size < 16 || body + 16 > buf.length) throw corrupted();
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14)
      };
    } else if (id === 'data') {
      data = { offset: body, length: Math.min(size, buf.length - body) };
      break;
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data || data.length <= 0) throw corrupted();
  if (fmt.format !== 1 || fmt.bitsPerSample !== 16) {
    throw new ApiError(415, 'Only 16-bit PCM WAV files are supported. Please convert the file or use the recorder.', 'UNSUPPORTED_WAV_ENCODING');
  }
  if (fmt.channels < 1 || fmt.channels > 2 || fmt.sampleRate < 8000 || fmt.sampleRate > 96000) throw corrupted();
  const frames = Math.floor(data.length / (fmt.channels * 2));
  const durationSec = frames / fmt.sampleRate;
  if (durationSec < 0.3) throw new ApiError(422, 'The recording is too short. Please record at least one second.', 'TOO_SHORT');
  return { ...fmt, dataOffset: data.offset, frames, durationSec };
}

/** Loudness statistics used by the distress engine. Amplitudes are 0..1. */
export function wavFeatures(buf, info) {
  const { dataOffset, channels, sampleRate } = info;
  const frames = Math.min(info.frames, sampleRate * 60);
  const win = Math.max(1, Math.floor(sampleRate * 0.05));
  const stride = channels * 2;
  let sumSq = 0;
  let peak = 0;
  const winRms = [];
  let wSum = 0;
  let wCount = 0;
  for (let i = 0; i < frames; i++) {
    const s = buf.readInt16LE(dataOffset + i * stride) / 32768;
    const a = Math.abs(s);
    if (a > peak) peak = a;
    sumSq += s * s;
    wSum += s * s;
    if (++wCount === win) {
      winRms.push(Math.sqrt(wSum / wCount));
      wSum = 0;
      wCount = 0;
    }
  }
  const sorted = [...winRms].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const thr = Math.max(0.008, 0.25 * p95);
  const active = winRms.filter((r) => r > thr).length;
  return {
    rms: Math.sqrt(sumSq / Math.max(1, frames)),
    peak,
    activeRatio: winRms.length ? active / winRms.length : 0,
    durationSec: info.durationSec,
    sampleRate
  };
}

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
