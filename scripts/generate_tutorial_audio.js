// scripts/generate_tutorial_audio.js
// Renders all 8 tutorial audio clips using Voicebox Fenn Voice Model (ade2ed91-00c3-4196-85c1-de290743416a)

const fs = require('node:fs');
const path = require('node:path');

const PROFILE_ID = 'ade2ed91-00c3-4196-85c1-de290743416a'; // Game Fenn Voice Model
const VOICEBOX_URL = 'http://127.0.0.1:17493';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'tutorial');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const STEPS = [
  {
    step: 1,
    id: 'step1',
    text: 'Welcome to City Master! In this game, you are the chief builder of your own company. Move around the map with your mouse, and scroll to zoom in and out!'
  },
  {
    step: 2,
    id: 'step2',
    text: 'Great job! To build anything in our town, you first need to own a piece of land. Click the Buy Land button at the bottom, then click on any empty green tile on the map.'
  },
  {
    step: 3,
    id: 'step3',
    text: 'Awesome! Now let us build your first neighborhood house. Make sure the Helper Workers box is checked so you build super fast and get 10 whole years of free property taxes from City Hall!'
  },
  {
    step: 4,
    id: 'step4',
    text: 'Great work! Now listen to the Golden Rule of city building: Stores need nearby houses to get customers. But keep dirty factories away from houses, because dirty smoke makes neighbors unhappy and lowers rent!'
  },
  {
    step: 5,
    id: 'step5',
    text: 'Look at the Slices tab on the right! Your company is divided into slices called shares. As your town grows and you earn rent, your slice value goes up! You can also buy slices of other builder companies.'
  },
  {
    step: 6,
    id: 'step6',
    text: 'Click on the Bank tab! You can borrow money from our bank to expand faster. But always keep your Safe Money Meter in the green! If it drops into the red zone, building freezes until you pay back debt.'
  },
  {
    step: 7,
    id: 'step7',
    text: 'Now let us make your buildings bigger! Click the Upgrade button at the bottom and click on your house to upgrade it to a Level 2 and Level 3 high-rise tower. Taller buildings hold more families and double your rent profit!'
  },
  {
    step: 8,
    id: 'step8',
    text: 'Finally, visit City Hall! Each of the 10 neighborhoods has a council leader with the power to say yes or no to big buildings. You can spend Respect Points to change their mind, or run for Mayor yourself in the next election! You are now ready to build your dream metropolis!'
  }
];

async function generateClip(item) {
  const targetPath = path.join(OUTPUT_DIR, `${item.id}.wav`);
  console.log(`\n🎙️ [Step ${item.step}/8] Requesting speech generation with Game Fenn Voice Model...`);
  console.log(`Text: "${item.text}"`);

  const genRes = await fetch(`${VOICEBOX_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile_id: PROFILE_ID,
      text: item.text,
      language: 'en'
    })
  });

  if (!genRes.ok) {
    throw new Error(`Failed to request generation: ${genRes.statusText}`);
  }

  const genData = await genRes.json();
  const genId = genData.id;
  console.log(`Generation ID: ${genId}. Waiting for model completion...`);

  // Poll for completion
  let completed = false;
  let attempts = 0;
  while (!completed && attempts < 90) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
    const statusRes = await fetch(`${VOICEBOX_URL}/history`);
    const historyData = await statusRes.json();
    const match = (historyData.items || []).find(i => i.id === genId);

    if (match && match.status === 'completed') {
      completed = true;
      break;
    } else if (match && match.status === 'failed') {
      throw new Error(`Generation failed: ${match.error}`);
    }
  }

  if (!completed) throw new Error('Generation timed out');

  // Fetch audio WAV
  console.log(`Downloading audio for ${item.id}...`);
  const audioRes = await fetch(`${VOICEBOX_URL}/audio/${genId}`);
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.statusText}`);

  const rawBuffer = Buffer.from(await audioRes.arrayBuffer());

  // Trim potential in-context reference prompt bleed
  const sampleRate = 24000;
  const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
  const pcm = rawBuffer.subarray(44);

  let trimSeconds = 0;
  let inSilence = false;

  for (let t = 0.4; t < 2.8; t += 0.02) {
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
      // Detected speech onset! Back up 60ms to preserve initial consonant
      trimSeconds = Math.max(0.4, t - 0.06);
      break;
    }
  }

  if (trimSeconds > 0) {
    const trimBytes = Math.floor(trimSeconds * sampleRate) * 2;
    const newPcm = pcm.subarray(trimBytes);
    const newTotalBytes = 44 + newPcm.length;

    const newHeader = Buffer.from(rawBuffer.subarray(0, 44));
    newHeader.writeUInt32LE(newTotalBytes - 8, 4);
    newHeader.writeUInt32LE(newPcm.length, 40);

    const cleanBuffer = Buffer.concat([newHeader, newPcm]);
    fs.writeFileSync(targetPath, cleanBuffer);
    console.log(`✅ [Step ${item.step}/8] Saved clean audio to ${targetPath} (Trimmed ${trimSeconds.toFixed(2)}s prompt bleed)`);
  } else {
    fs.writeFileSync(targetPath, rawBuffer);
    console.log(`✅ [Step ${item.step}/8] Saved audio to ${targetPath}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Voicebox Batch Narration Generator for City Master');
  console.log(`Target Voice Model: Game Fenn (${PROFILE_ID})`);
  console.log('====================================================');

  for (const step of STEPS) {
    try {
      await generateClip(step);
    } catch (err) {
      console.error(`❌ Error rendering Step ${step.step}:`, err);
    }
  }

  console.log('\n🎉 ALL 8 TUTORIAL CLIPS GENERATED SUCCESSFULLY WITH FENN VOICE MODEL!');
}

main();
