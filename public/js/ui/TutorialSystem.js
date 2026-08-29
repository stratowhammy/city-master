// public/js/ui/TutorialSystem.js
// Interactive 5th-Grade Step-by-Step Tutorial Wizard with Text-to-Speech (TTS)

class TutorialSystem {
  constructor(network, renderer, ui) {
    this.network = network;
    this.renderer = renderer;
    this.ui = ui;

    this.isActive = false;
    this.currentStep = 0;

    this.steps = [
      {
        id: 'WELCOME',
        stepNum: 1,
        audioSrc: 'audio/tutorial/step1.wav',
        speaker: 'Sal "Wrench" Sullivan (Voiced by Fenn)',
        avatar: '👷‍♂️',
        title: 'Step 1 of 8: Welcome to City Master!',
        speech: 'Welcome to City Master! In this game, you are the chief builder of your own company. You will buy land, build houses, launch floating sky cities, and become the most successful builder in town. Let us learn how to look around the map!',
        body: `
          <p>You are the boss of your own building company, <strong>Pinnacle Metro</strong>!</p>
          <p class="mt-2">🖱️ <strong>Try this right now:</strong> Click and drag anywhere on the map to move the camera around, and scroll your mouse wheel to zoom in and out!</p>
        `,
        goal: 'Move or zoom the map, then click "Next Step".',
        buttonText: 'Next Step 👉',
        onStart: () => {}
      },
      {
        id: 'BUY_LAND',
        stepNum: 2,
        audioSrc: 'audio/tutorial/step2.wav',
        speaker: 'Eleanor Vance (Voiced by Fenn)',
        avatar: '🏛️',
        title: 'Step 2 of 8: Buying Your First Land!',
        speech: 'Great job! To build anything in our town, you first need to own a piece of land. Click the Buy Land button at the bottom, then click on any empty green tile on the map.',
        body: `
          <p>Before you can build houses or shops, you need to purchase land from the town.</p>
          <div class="p-2.5 rounded bg-sky-950/60 border border-sky-600/50 mt-2">
            <strong>🎯 Your Goal:</strong> Click the <span class="text-sky-300 font-bold">🏷️ Buy Land</span> button in the bottom toolbar, then click on an empty green tile!
          </div>
        `,
        goal: 'Buy 1 land parcel.',
        buttonText: 'I Bought Land 👉',
        onStart: () => {
          const buyBtn = document.querySelector('[data-tool="BUY_LAND"]');
          if (buyBtn) buyBtn.click();
        }
      },
      {
        id: 'BUILD_HOUSE',
        stepNum: 3,
        audioSrc: 'audio/tutorial/step3.wav',
        speaker: 'Sal "Wrench" Sullivan (Voiced by Fenn)',
        avatar: '👷‍♂️',
        title: 'Step 3 of 8: Building with Helper Workers!',
        speech: 'Awesome! Now let us build your first neighborhood house. Make sure the Helper Workers box is checked so you build super fast and get 10 whole years of free property taxes from City Hall!',
        body: `
          <p>Houses give citizens a place to live and earn you <strong>rent money</strong> every tick!</p>
          <div class="p-2.5 rounded bg-emerald-950/60 border border-emerald-600/50 mt-2">
            <strong>🎯 Your Goal:</strong> Click <span class="text-emerald-300 font-bold">🏠 House</span> in the bottom toolbar, make sure <span class="text-amber-300 font-bold">👷‍♂️ Helper Workers</span> is checked, and click your land tile!
          </div>
        `,
        goal: 'Build 1 residential house on your land.',
        buttonText: 'I Built a House 👉',
        onStart: () => {
          const houseBtn = document.querySelector('[data-tool="BUILD_RESIDENTIAL"]');
          if (houseBtn) houseBtn.click();
        }
      },
      {
        id: 'STORES_AND_SMOKE',
        stepNum: 4,
        audioSrc: 'audio/tutorial/step4.wav',
        speaker: 'Tara Green (Voiced by Fenn)',
        avatar: '🌿',
        title: 'Step 4 of 8: Stores and Dirty Smoke Rules!',
        speech: 'Great work! Now listen to the Golden Rule of city building: Stores need nearby houses to get customers. But keep dirty factories away from houses, because dirty smoke makes neighbors unhappy and lowers rent!',
        body: `
          <p>🏢 <strong>Stores</strong> love being near houses so people can shop.</p>
          <p class="mt-1">🏭 <strong>Factories</strong> create dirty smoke (🌫️). If you place factories near houses, rent drops!</p>
          <div class="p-2.5 rounded bg-slate-900 border border-slate-700 mt-2 text-xs">
            💡 <em>Tip: You can click the <strong>"Dirty Smoke 🌫️"</strong> button at the top to see where factory smoke spreads!</em>
          </div>
        `,
        goal: 'Learn about neighborhood happiness.',
        buttonText: 'Next Step 👉',
        onStart: () => {}
      },
      {
        id: 'STOCK_SLICES',
        stepNum: 5,
        audioSrc: 'audio/tutorial/step5.wav',
        speaker: 'Arthur Sterling (Voiced by Fenn)',
        avatar: '🏦',
        title: 'Step 5 of 8: Company Slices (Stock Market)!',
        speech: 'Look at the Slices tab on the right! Your company is divided into slices called shares. As your town grows and you earn rent, your slice value goes up! You can also buy slices of other builder companies.',
        body: `
          <p>Every builder in town is on the <strong>City Stock Exchange</strong>.</p>
          <p class="mt-1">📈 When you earn rent and buy land, your <strong>Slice Value</strong> goes up!</p>
          <p class="mt-1">🤝 <strong>Super Secret:</strong> If you buy more than 50% of another company slices, you can <em>Take Over</em> their whole company!</p>
        `,
        goal: 'Check the Slices tab.',
        buttonText: 'Next Step 👉',
        onStart: () => {
          const tab = document.querySelector('[data-tab="STOCKS"]');
          if (tab) tab.click();
        }
      },
      {
        id: 'BANK_LOANS',
        stepNum: 6,
        audioSrc: 'audio/tutorial/step6.wav',
        speaker: 'Arthur Sterling (Voiced by Fenn)',
        avatar: '🏦',
        title: 'Step 6 of 8: Bank Loans & Safe Money Meter!',
        speech: 'Click on the Bank tab! You can borrow money from our bank to expand faster. But always keep your Safe Money Meter in the green! If it drops into the red zone, building freezes until you pay back debt.',
        body: `
          <p>Need extra cash to build big projects? The bank has you covered!</p>
          <div class="p-2.5 rounded bg-indigo-950/60 border border-indigo-600/50 mt-2">
            <strong>🛡️ Safe Money Meter Rules:</strong>
            <p>• 🟢 <strong>Green (130%+):</strong> You are super safe!</p>
            <p>• 🟡 <strong>Yellow (110%-130%):</strong> Warning! Buffer getting thin.</p>
            <p>• 🔴 <strong>Red (Under 110%):</strong> Debt Alert! You must pay back money or sell shares.</p>
          </div>
        `,
        goal: 'Learn how to keep your Safe Money Meter in the green.',
        buttonText: 'Next Step 👉',
        onStart: () => {
          const tab = document.querySelector('[data-tab="MARGIN"]');
          if (tab) tab.click();
        }
      },
      {
        id: 'UPGRADE_BUILDINGS',
        stepNum: 7,
        speaker: 'Sal "Wrench" Sullivan (Voiced by Fenn)',
        avatar: '🏗️',
        title: 'Step 7 of 8: Upgrading to High-Rise Towers!',
        speech: 'Now let us make your buildings bigger! Click the Upgrade button at the bottom and click on your house to upgrade it to a Level 2 and Level 3 high-rise tower. Taller buildings hold more families and double your rent profit!',
        body: `
          <p>🏗️ <strong>High-Rise Upgrades:</strong> Make your existing buildings taller and more profitable!</p>
          <p class="mt-1">🏢 <strong>Level 2 & Level 3:</strong> Earn double and triple rent income on the exact same piece of land.</p>
          <div class="p-2.5 rounded bg-sky-950/60 border border-sky-600/50 mt-2">
            💡 <em>Tip: Upgrading existing land is often cheaper than buying new land parcels!</em>
          </div>
        `,
        goal: 'Learn how to upgrade buildings into towers.',
        buttonText: 'Next Step 👉',
        onStart: () => {
          const upBtn = document.querySelector('[data-tool="UPGRADE"]');
          if (upBtn) upBtn.click();
        }
      },
      {
        id: 'CITY_HALL_RULES',
        stepNum: 8,
        audioSrc: 'audio/tutorial/step8.wav',
        speaker: 'Eleanor Vance (Voiced by Fenn)',
        avatar: '🏛️',
        title: 'Step 8 of 8: Neighborhood Leaders & Respect Points!',
        speech: 'Finally, visit City Hall! Each of the 10 neighborhoods has a council leader with the power to say yes or no to big buildings. You can spend Respect Points to change their mind, or run for Mayor yourself in the next election! You are now ready to build your dream metropolis!',
        body: `
          <p>🏛️ <strong>Neighborhood Leader Rule:</strong> District leaders can veto big factories or sky cities in their area.</p>
          <p class="mt-1">⭐ <strong>Respect Points:</strong> Earned by helping the city; spend 50 points to override any neighborhood rule!</p>
          <p class="mt-1">👑 <strong>Run for Mayor:</strong> Win the town election to control taxes and lead peace treaties!</p>
          <div class="p-3 rounded bg-emerald-950 border border-emerald-500 text-center font-bold text-emerald-300 mt-3">
            🎉 Congratulations! You completed the tutorial and earned $50,000 + 50 Respect Points!
          </div>
        `,
        goal: 'Finish tutorial and start playing!',
        buttonText: 'Start Playing! 🚀',
        onStart: () => {
          const tab = document.querySelector('[data-tab="POLITICS"]');
          if (tab) tab.click();
        }
      }
    ];

    this.createTutorialModal();
  }

  createTutorialModal() {
    const modal = document.createElement('div');
    modal.id = 'modal-tutorial';
    modal.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 w-[92%] max-w-xl bg-slate-900/95 border-2 border-sky-500 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-50 transition-all duration-300 hidden';

    modal.innerHTML = `
      <div class="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-3">
        <div class="flex items-center gap-3">
          <span id="tut-avatar" class="text-3xl p-1 bg-slate-800 rounded-xl border border-slate-700">👷‍♂️</span>
          <div>
            <div id="tut-speaker" class="text-xs font-extrabold text-sky-400">Sal "Wrench" Sullivan</div>
            <div id="tut-title" class="text-sm font-black text-slate-100">Step 1 of 8: Welcome to City Master!</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="tut-tts-btn" class="tts-btn" title="Read Aloud">🔊 Read</button>
          <button id="tut-close-btn" class="text-slate-400 hover:text-slate-200 text-lg font-bold px-2 py-0.5 rounded bg-slate-800" title="Close Tutorial">✕</button>
        </div>
      </div>

      <div id="tut-body" class="text-xs text-slate-200 leading-relaxed py-3 space-y-2"></div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-800">
        <div id="tut-progress" class="text-[11px] font-bold text-slate-400">Step 1 / 8</div>
        <div class="flex gap-2">
          <button id="tut-prev-btn" class="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all">👈 Back</button>
          <button id="tut-next-btn" class="py-1.5 px-4 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg transition-all">Next Step 👉</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('tut-close-btn').onclick = () => this.stop();
    document.getElementById('tut-prev-btn').onclick = () => this.previousStep();
    document.getElementById('tut-next-btn').onclick = () => this.nextStep();
    document.getElementById('tut-tts-btn').onclick = () => {
      const step = this.steps[this.currentStep];
      if (step) SpeechHelper.playAudioOrSpeak(step.audioSrc, step.speech);
    };
  }

  start() {
    this.isActive = true;
    this.currentStep = 0;
    const modal = document.getElementById('modal-tutorial');
    if (modal) modal.classList.remove('hidden');
    this.renderStep();
  }

  stop() {
    this.isActive = false;
    SpeechHelper.stop();
    const modal = document.getElementById('modal-tutorial');
    if (modal) modal.classList.add('hidden');
  }

  renderStep() {
    const step = this.steps[this.currentStep];
    if (!step) return;

    document.getElementById('tut-avatar').innerText = step.avatar;
    document.getElementById('tut-speaker').innerText = step.speaker;
    document.getElementById('tut-title').innerText = step.title;
    document.getElementById('tut-body').innerHTML = step.body;
    document.getElementById('tut-progress').innerText = `Step ${this.currentStep + 1} / ${this.steps.length}`;
    document.getElementById('tut-next-btn').innerText = step.buttonText;

    const prevBtn = document.getElementById('tut-prev-btn');
    if (this.currentStep === 0) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }

    if (step.onStart) step.onStart();

    // Only auto-play if Auto Read is enabled in Settings (clicking speaker button always plays)
    SpeechHelper.playAudioOrSpeakIfAuto(step.audioSrc, step.speech);
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      // Completed tutorial! Award reward
      const firm = this.network.gameState.firms.get(this.network.firmId);
      if (firm) {
        firm.cash += 50000;
        firm.influencePoints += 50;
        this.network.gameState.addNews('🎉 TUTORIAL GRADUATE: Completed the City Master Academy! Rewarded $50,000 cash and 50 Respect Points.', 'success');
      }
      this.stop();
      this.ui.showToast('🎉 Congratulations! You completed the Tutorial!', 'success');
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }
}

window.TutorialSystem = TutorialSystem;
