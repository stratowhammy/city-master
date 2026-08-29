// scripts/generate_tutorial_audio.js
// Renders all 8 tutorial audio clips using Voicebox Fenn Voice Model

const fs = require('node:fs');
const path = require('node:path');

const PROFILE_ID = 'b4189a81-2352-491f-bfd3-3e4a7c9431f7'; // Fenn Voice Model
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
    text: 'Great job! Click the Buy Land button at the bottom, then click on any empty green tile on the map to purchase it.'
  },
  {
    step: 3,
    id: 'step3',
    text: 'Awesome! Click House in the toolbar, make sure Helper Workers is checked, and click your land to build your first neighborhood house!'
  },
  {
    step: 4,
    id: 'step4',
    text: 'Stores love being near houses to get customers. But keep dirty factories away so neighbors stay happy and your rent stays high!'
  },
  {
    step: 5,
    id: 'step5',
    text: 'Check the Slices tab! As your town grows, your slice value goes up. You can also buy slices of other builder companies.'
  },
  {
    step: 6,
    id: 'step6',
    text: 'In the Bank tab, you can borrow money from our piggy bank to expand faster. Always keep your Safe Money Meter in the green!'
  },
  {
    step: 7,
    id: 'step7',
    text: 'Floating Sky Cities hover high up in the clouds at Z equals 64! They escape ground smoke, but need Super Floating Crystals to stay in the air.'
  },
  {
    step: 8,
    id: 'step8',
    text: 'Visit City Hall! Spend Respect Points to pass rules, or run for Mayor in the town election! You are now ready to build your dream metropolis!'
  }
];

async function generateClip(item) {
  const targetPath = path.join(OUTPUT_DIR, `${item.id}.wav`);
  console.log(`\n🎙️ [Step ${item.step}/8] Generating speech with Fenn Voice Model...`);
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
  console.log(`Generation ID: ${genId}. Waiting for completion...`);

  // Poll for completion
  let completed = false;
  let attempts = 0;
  while (!completed && attempts < 60) {
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

  // Fetch audio stream
  const audioRes = await fetch(`${VOICEBOX_URL}/audio/${genId}`);
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.statusText}`);

  const buffer = Buffer.from(await audioRes.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);
  console.log(`✅ Saved ${item.id}.wav (${buffer.length} bytes) to ${targetPath}`);
}

async function main() {
  console.log(`=======================================================`);
  console.log(`🎧 RENDERING CITY MASTER TUTORIAL USING FENN VOICE MODEL`);
  console.log(`=======================================================`);

  for (const item of STEPS) {
    try {
      await generateClip(item);
    } catch (err) {
      console.error(`❌ Error generating Step ${item.step}:`, err.message);
    }
  }

  console.log(`\n🎉 ALL TUTORIAL AUDIO CLIPS RENDERED WITH FENN VOICE MODEL!`);
}

main();
