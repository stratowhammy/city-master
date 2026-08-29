// scripts/trim_audio_bleed.js
// Trims prompt bleed ("ever finds it") from the beginning of all tutorial audio files

const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'public', 'audio', 'tutorial');
const sampleRate = 24000;
const windowSize = Math.floor(sampleRate * 0.05); // 50ms = 1200 samples

for (let s = 1; s <= 8; s++) {
  const filePath = path.join(DIR, `step${s}.wav`);
  if (!fs.existsSync(filePath)) continue;

  const buf = fs.readFileSync(filePath);
  const pcm = buf.subarray(44);

  // Find silence boundary after the prompt bleed (around 0.7s - 1.6s)
  let trimSeconds = 0;
  let inSilence = false;

  for (let t = 0.5; t < 2.5; t += 0.02) {
    const sampleIdx = Math.floor(t * sampleRate);
    if ((sampleIdx + windowSize) * 2 >= pcm.length) break;

    let sumSq = 0;
    for (let i = 0; i < windowSize; i++) {
      const val = pcm.readInt16LE((sampleIdx + i) * 2);
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / windowSize);

    if (rms < 60 && !inSilence) {
      inSilence = true;
    }

    if (inSilence && rms > 250) {
      // Found the onset of the real speech! Back up slightly (50ms) to not clip the consonant
      trimSeconds = Math.max(0.6, t - 0.06);
      break;
    }
  }

  if (trimSeconds === 0) {
    trimSeconds = 1.2; // Safe fallback
  }

  const trimBytes = Math.floor(trimSeconds * sampleRate) * 2;
  const newPcm = pcm.subarray(trimBytes);
  const newTotalBytes = 44 + newPcm.length;

  const newHeader = Buffer.from(buf.subarray(0, 44));
  newHeader.writeUInt32LE(newTotalBytes - 8, 4); // ChunkSize
  newHeader.writeUInt32LE(newPcm.length, 40);    // Subchunk2Size

  const finalBuf = Buffer.concat([newHeader, newPcm]);
  fs.writeFileSync(filePath, finalBuf);

  console.log(`✅ Trimmed Step ${s}: removed first ${trimSeconds.toFixed(2)}s. New length: ${((newPcm.length / 2) / sampleRate).toFixed(2)}s`);
}

console.log('\n🎉 ALL 8 AUDIO CLIPS TRIMMED CLEANLY (Prompt bleed removed)!');
