// public/js/ui/UIController.js
// 5th-Grade Accessible UI Manager with Text-to-Speech (TTS) Speaker Buttons

class UIController {
  constructor(network, renderer, advisor) {
    this.network = network;
    this.renderer = renderer;
    this.advisor = advisor;

    this.selectedTool = 'INSPECT';
    this.unionPledge = true;
    this.activeTab = 'STOCKS';

    this.initDOM();
    this.initEventListeners();
    this.initCanvasInteractions();
  }

  initDOM() {
    this.elCash = document.getElementById('hud-cash');
    this.elStockPrice = document.getElementById('hud-stock-price');
    this.elNetWorth = document.getElementById('hud-net-worth');
    this.elMarginRatio = document.getElementById('hud-margin-ratio');
    this.elMarginBadge = document.getElementById('hud-margin-badge');
    this.elInfluence = document.getElementById('hud-influence');
    this.elMayorName = document.getElementById('hud-mayor-name');
    this.elTickCount = document.getElementById('hud-tick-count');

    this.modalMarginCall = document.getElementById('modal-margin-call');
    this.modalVeto = document.getElementById('modal-veto');
  }

  initEventListeners() {
    // Toolbar tool buttons
    // Toolbar tool buttons
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTool = btn.dataset.tool;
        this.renderer.activeTool = this.selectedTool;
        
        let msg = `Selected: ${btn.title || this.selectedTool}`;
        if (this.selectedTool === 'BUY_LAND') {
          msg = 'Buy Land active: All available land is highlighted in glowing neon green!';
          SpeechHelper.speakIfAuto('Buy Land active. Available land is highlighted in neon green with price tags.');
        }
        this.showToast(msg);
      });
    });

    // Building & Density Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filterKey = btn.dataset.filter;
        if (!filterKey || !this.renderer.buildingFilters) return;

        const currentVal = this.renderer.buildingFilters[filterKey];
        const newVal = !currentVal;
        this.renderer.buildingFilters[filterKey] = newVal;

        if (newVal) {
          btn.classList.add('active');
          btn.classList.remove('off');
          this.showToast(`Filter: ${btn.innerText} ON`);
          SpeechHelper.speakIfAuto(`${btn.innerText} turned on.`);
        } else {
          btn.classList.remove('active');
          btn.classList.add('off');
          this.showToast(`Filter: ${btn.innerText} OFF`);
          SpeechHelper.speakIfAuto(`${btn.innerText} turned off.`);
        }
      });
    });

    // Show All Filters button
    const showAllBtn = document.getElementById('btn-show-all-filters');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        for (const key of Object.keys(this.renderer.buildingFilters)) {
          this.renderer.buildingFilters[key] = true;
        }
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.add('active');
          b.classList.remove('off');
        });
        this.showToast('All building filters turned ON');
        SpeechHelper.speakIfAuto('All building filters turned on.');
      });
    }

    // Helper Workers (Union Labor) toggle
    const unionToggle = document.getElementById('toggle-union-labor');
    if (unionToggle) {
      unionToggle.addEventListener('change', (e) => {
        this.unionPledge = e.target.checked;
        const msg = this.unionPledge 
          ? 'Helper Workers ON: Faster building and 10 years of free taxes!' 
          : 'Helper Workers OFF: Cheaper up front, but risk of workers on strike.';
        this.showToast(msg);
      });
    }

    // Overlay selector buttons
    const overlayBtns = document.querySelectorAll('.overlay-btn');
    overlayBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        overlayBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderer.overlayMode = btn.dataset.overlay;
        
        let voiceMsg = `Switched to ${btn.innerText} view.`;
        if (this.renderer.overlayMode === 'UNOWNED') {
          voiceMsg = 'For Sale view: Available land is highlighted in glowing neon green with price tags!';
        } else if (this.renderer.overlayMode === 'POLLUTION') {
          voiceMsg = 'Pollution view: Showing dirty smoke percentages on each square. Red means heavy smoke!';
        } else if (this.renderer.overlayMode === 'LAND_VALUE') {
          voiceMsg = 'Land Value view: Showing exact dollar value for each square. Gold and green mean high value!';
        }
        this.showToast(voiceMsg);
        SpeechHelper.speakIfAuto(voiceMsg);
      });
    });

    // Settings Modal
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('modal-settings');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const toggleAutoRead = document.getElementById('setting-toggle-autoread');
    const speechRateInput = document.getElementById('setting-speech-rate');
    const speechPitchInput = document.getElementById('setting-speech-pitch');
    const rateValLabel = document.getElementById('setting-rate-val');
    const pitchValLabel = document.getElementById('setting-pitch-val');
    const testVoiceBtn = document.getElementById('setting-test-voice-btn');

    if (toggleAutoRead) {
      toggleAutoRead.checked = SpeechHelper.autoReadEnabled;
      toggleAutoRead.addEventListener('change', (e) => {
        SpeechHelper.toggleAutoRead(e.target.checked);
        this.showToast(`Auto Read: ${SpeechHelper.autoReadEnabled ? 'ENABLED' : 'DISABLED'}`);
      });
    }

    if (speechRateInput && rateValLabel) {
      speechRateInput.value = SpeechHelper.voiceProfile.settings.rate || 0.95;
      rateValLabel.innerText = `${speechRateInput.value}x`;
      speechRateInput.addEventListener('input', (e) => {
        rateValLabel.innerText = `${e.target.value}x`;
        SpeechHelper.voiceProfile.settings.rate = parseFloat(e.target.value);
      });
    }

    if (speechPitchInput && pitchValLabel) {
      speechPitchInput.value = SpeechHelper.voiceProfile.settings.pitch || 1.05;
      pitchValLabel.innerText = `${speechPitchInput.value}`;
      speechPitchInput.addEventListener('input', (e) => {
        pitchValLabel.innerText = `${e.target.value}`;
        SpeechHelper.voiceProfile.settings.pitch = parseFloat(e.target.value);
      });
    }

    if (testVoiceBtn) {
      testVoiceBtn.addEventListener('click', () => {
        SpeechHelper.speak('Hello! Voice settings are configured with Fenn voice profile.');
      });
    }

    const openSettings = () => {
      if (modalSettings) {
        if (toggleAutoRead) toggleAutoRead.checked = SpeechHelper.autoReadEnabled;
        modalSettings.classList.remove('hidden');
      }
    };

    const closeSettings = () => {
      if (modalSettings) {
        modalSettings.classList.add('hidden');
        SpeechHelper.stop();
      }
    };

    if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettings);
    if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', closeSettings);

    // Sidebar tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
        const target = document.getElementById(`tab-${this.activeTab.toLowerCase()}`);
        if (target) target.classList.remove('hidden');
        if (this.network.gameState) {
          this.renderSidebar(this.network.gameState, this.network.firmId);
        }
      });
    });

    // Game Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.dataset.speed || '1.0');
        this.network.setGameSpeed(speed);
      });
    });

    // Scenario Selectors
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const scenario = btn.dataset.scenario;
        if (confirm(`Start game mission: ${btn.innerText}?`)) {
          this.network.resetScenario(scenario);
        }
      });
    });

    // Network Callbacks
    this.lastSidebarRender = 0;
    this.network.callbacks.onInit = (state, firmId) => {
      this.updateHUD(state, firmId);
      this.renderSidebar(state, firmId);
    };

    this.network.callbacks.onDelta = (state) => {
      this.updateHUD(state, this.network.firmId);
      const now = Date.now();
      if (now - this.lastSidebarRender >= 1000) {
        this.lastSidebarRender = now;
        this.renderSidebar(state, this.network.firmId);
      }
      this.checkMarginAlerts(state, this.network.firmId);
    };

    this.network.callbacks.onActionSuccess = (data) => {
      this.showToast(`✅ ${data.message}`, 'success');
    };

    this.network.callbacks.onActionError = (data) => {
      this.showToast(`⚠️ ${data.message}`, 'error');
      if (data.vetoed) {
        this.showVetoModal(data.districtId, data.message);
      }
    };

    this.network.callbacks.onChat = (chat) => {
      this.appendChatMessage(chat);
    };

    // Chat input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
          this.network.sendChatMessage(chatInput.value.trim());
          chatInput.value = '';
        }
      });
    }
  }

  initCanvasInteractions() {
    const canvas = this.renderer.canvas;
    let isMouseDown = false;
    let mouseDownClientX = 0;
    let mouseDownClientY = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let isDraggingCamera = false;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isMouseDown = true;
        isDraggingCamera = false;
        mouseDownClientX = e.clientX;
        mouseDownClientY = e.clientY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        const totalDist = Math.hypot(e.clientX - mouseDownClientX, e.clientY - mouseDownClientY);
        if (totalDist > 6) {
          isDraggingCamera = true;
          // Smooth world-space panning
          this.renderer.camera.x += dx / this.renderer.camera.zoom;
          this.renderer.camera.y += dy / this.renderer.camera.zoom;
        }
      }

      // Update hovered tile position
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const gridPos = this.renderer.screenToGrid(screenX, screenY);
      const gs = this.network.gameState;

      if (gridPos && gs && gridPos.x >= 0 && gridPos.x < (gs.gridSize || 60) && gridPos.y >= 0 && gridPos.y < (gs.gridSize || 60)) {
        this.renderer.hoveredTile = gridPos;
        if (gs.grid && gs.grid[gridPos.x]) {
          this.updateTileInspector(gs.grid[gridPos.x][gridPos.y]);
        }
      } else {
        this.renderer.hoveredTile = null;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        const totalDist = Math.hypot(e.clientX - mouseDownClientX, e.clientY - mouseDownClientY);
        // If movement was less than 16px, treat as an intentional tile click
        if (totalDist < 16 && !isDraggingCamera) {
          const rect = canvas.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          const gridPos = this.renderer.screenToGrid(screenX, screenY);
          const gs = this.network.gameState;

          if (gridPos && gs && gridPos.x >= 0 && gridPos.x < (gs.gridSize || 60) && gridPos.y >= 0 && gridPos.y < (gs.gridSize || 60)) {
            this.executeToolAction(gridPos.x, gridPos.y);
          }
        }
      }
    });

    // Fallback direct click handler
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const gridPos = this.renderer.screenToGrid(screenX, screenY);
      const gs = this.network.gameState;

      if (gridPos && gs && gridPos.x >= 0 && gridPos.x < (gs.gridSize || 60) && gridPos.y >= 0 && gridPos.y < (gs.gridSize || 60)) {
        this.executeToolAction(gridPos.x, gridPos.y);
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.renderer.camera.zoom = Math.max(0.3, Math.min(2.5, this.renderer.camera.zoom * zoomFactor));
    }, { passive: false });
  }

  executeToolAction(x, y) {
    const gs = this.network.gameState;
    const tile = gs.grid && gs.grid[x] && gs.grid[x][y];
    if (!tile) return;

    this.renderer.selectedTile = { x, y };
    const firm = gs.firms instanceof Map ? gs.firms.get(this.network.firmId) : null;

    switch (this.selectedTool) {
      case 'INSPECT':
        this.updateTileInspector(tile, true);
        const district = gs.districts.find(d => d.id === tile.districtId);
        SpeechHelper.speakIfAuto(`Tile ${x}, ${y}. Neighborhood: ${district ? district.name : 'District ' + tile.districtId}. Value is ${tile.landValue} dollars.`);
        break;

      case 'BUY_LAND':
        if (tile.isWater) {
          this.showToast('You cannot buy water tiles! Fish live here.', 'error');
          SpeechHelper.speakIfAuto('You cannot buy water tiles.');
        } else if (tile.ownerId) {
          const owner = gs.firms.get(tile.ownerId);
          const isMine = (tile.ownerId === this.network.firmId);
          const msg = isMine ? 'You already own this land!' : `Owned by ${owner ? owner.name : 'another builder'}!`;
          this.showToast(msg, 'error');
          SpeechHelper.speakIfAuto(msg);
        } else {
          const cost = tile.landValue || 5000;
          if (firm && firm.cash < cost) {
            this.showToast(`Not enough cash! Need $${cost.toLocaleString()} to buy this land.`, 'error');
            SpeechHelper.speakIfAuto(`You need ${cost.toLocaleString()} dollars to buy this land.`);
            return;
          }
          // Optimistic local update
          if (firm) {
            firm.cash -= cost;
            tile.ownerId = firm.id;
            this.updateHUD(gs, this.network.firmId);
            this.showToast(`🏷️ Purchased land at (${x}, ${y}) for $${cost.toLocaleString()}!`, 'success');
            SpeechHelper.speakIfAuto(`Purchased land parcel at ${x}, ${y}!`);
          }
          this.network.buyLand(x, y);
        }
        break;

      case 'BUILD_RESIDENTIAL': {
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
          SpeechHelper.speakIfAuto('Buy this land first with the Buy Land button.');
          return;
        }
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only build on your own land!', 'error');
          return;
        }
        if (tile.groundBuilding && tile.groundBuilding.type !== 'ROAD') {
          this.showToast('This tile already has a building! Use Upgrade (⬆️) or Bulldoze (💣).', 'info');
          return;
        }

        const cost = this.unionPledge ? 22000 : 15000;
        if (firm && firm.cash < cost) {
          this.showToast(`Not enough cash! Need $${cost.toLocaleString()} to build a house.`, 'error');
          SpeechHelper.speakIfAuto(`You need ${cost.toLocaleString()} dollars to build a house.`);
          return;
        }

        // Optimistic local update
        if (firm) {
          firm.cash -= cost;
          tile.zoning = 'RESIDENTIAL';
          tile.roadLevel = 0;
          tile.groundBuilding = {
            type: 'RESIDENTIAL',
            level: 1,
            name: `${firm.name.split(' ')[0]} House L1`,
            constructedTick: gs.tick || 0,
            health: 100,
            taxAbatedUntil: this.unionPledge ? 9999 : 0,
            unionBuilt: !!this.unionPledge,
            rentIncome: 85,
            pollution: 0,
            crime: 0,
            population: 120,
            workers: 0
          };
          this.updateHUD(gs, this.network.firmId);
          this.showToast('🏠 Built neighborhood house!', 'success');
          SpeechHelper.speakIfAuto('Built neighborhood house!');
        }
        this.network.constructBuilding(x, y, 'RESIDENTIAL', this.unionPledge);
        break;
      }

      case 'BUILD_COMMERCIAL': {
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
          SpeechHelper.speakIfAuto('Buy this land first with the Buy Land button.');
          return;
        }
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only build on your own land!', 'error');
          return;
        }
        if (tile.groundBuilding && tile.groundBuilding.type !== 'ROAD') {
          this.showToast('This tile already has a building! Use Upgrade (⬆️) or Bulldoze (💣).', 'info');
          return;
        }

        const cost = this.unionPledge ? 22000 : 15000;
        if (firm && firm.cash < cost) {
          this.showToast(`Not enough cash! Need $${cost.toLocaleString()} to build a store.`, 'error');
          SpeechHelper.speakIfAuto(`You need ${cost.toLocaleString()} dollars to build a store.`);
          return;
        }

        // Optimistic local update
        if (firm) {
          firm.cash -= cost;
          tile.zoning = 'COMMERCIAL';
          tile.roadLevel = 0;
          tile.groundBuilding = {
            type: 'COMMERCIAL',
            level: 1,
            name: `${firm.name.split(' ')[0]} Store L1`,
            constructedTick: gs.tick || 0,
            health: 100,
            taxAbatedUntil: this.unionPledge ? 9999 : 0,
            unionBuilt: !!this.unionPledge,
            rentIncome: 110,
            pollution: 0,
            crime: 8,
            population: 0,
            workers: 60
          };
          this.updateHUD(gs, this.network.firmId);
          this.showToast('🏪 Built neighborhood store!', 'success');
          SpeechHelper.speakIfAuto('Built neighborhood store!');
        }
        this.network.constructBuilding(x, y, 'COMMERCIAL', this.unionPledge);
        break;
      }

      case 'BUILD_INDUSTRIAL': {
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
          SpeechHelper.speakIfAuto('Buy this land first with the Buy Land button.');
          return;
        }
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only build on your own land!', 'error');
          return;
        }
        if (tile.groundBuilding && tile.groundBuilding.type !== 'ROAD') {
          this.showToast('This tile already has a building! Use Upgrade (⬆️) or Bulldoze (💣).', 'info');
          return;
        }

        const cost = this.unionPledge ? 22000 : 15000;
        if (firm && firm.cash < cost) {
          this.showToast(`Not enough cash! Need $${cost.toLocaleString()} to build a factory.`, 'error');
          SpeechHelper.speakIfAuto(`You need ${cost.toLocaleString()} dollars to build a factory.`);
          return;
        }

        // Optimistic local update
        if (firm) {
          firm.cash -= cost;
          tile.zoning = 'INDUSTRIAL';
          tile.roadLevel = 0;
          tile.groundBuilding = {
            type: 'INDUSTRIAL',
            level: 1,
            name: `${firm.name.split(' ')[0]} Factory L1`,
            constructedTick: gs.tick || 0,
            health: 100,
            taxAbatedUntil: this.unionPledge ? 9999 : 0,
            unionBuilt: !!this.unionPledge,
            rentIncome: 140,
            pollution: 30,
            crime: 0,
            population: 0,
            workers: 35
          };
          this.updateHUD(gs, this.network.firmId);
          this.showToast('🏭 Built industrial factory!', 'success');
          SpeechHelper.speakIfAuto('Built industrial factory!');
        }
        this.network.constructBuilding(x, y, 'INDUSTRIAL', this.unionPledge);
        break;
      }

      case 'BUILD_ARCOLOGY':
        this.showToast('Sky Cities are currently disabled.', 'info');
        break;

      case 'UPGRADE': {
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only upgrade your own buildings!', 'error');
        } else if (!tile.groundBuilding || tile.groundBuilding.type === 'ROAD') {
          this.showToast('Nothing to upgrade on this tile!', 'error');
        } else if (tile.groundBuilding.level >= 3) {
          this.showToast('This building is already at Maximum Level 3 High-Rise!', 'info');
        } else {
          const newLvl = tile.groundBuilding.level + 1;
          const cost = newLvl * 25000;
          if (firm && firm.cash < cost) {
            this.showToast(`Need $${cost.toLocaleString()} to upgrade to Level ${newLvl}!`, 'error');
            return;
          }
          if (firm) {
            firm.cash -= cost;
            tile.groundBuilding.level = newLvl;
            this.updateHUD(gs, this.network.firmId);
            this.showToast(`⬆️ Upgraded building to Level ${newLvl}!`, 'success');
            SpeechHelper.speakIfAuto(`Upgraded building to Level ${newLvl}!`);
          }
          this.network.upgradeBuilding(x, y);
        }
        break;
      }

      case 'DEMOLISH': {
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only bulldoze your own buildings!', 'error');
        } else {
          tile.groundBuilding = null;
          tile.zoning = 'NONE';
          this.showToast('💣 Bulldozed structure.', 'info');
          SpeechHelper.speakIfAuto('Bulldozed structure.');
          this.network.demolish(x, y);
        }
        break;
      }

      case 'TAX_ABATEMENT':
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only ask for free taxes on your own buildings!', 'error');
        } else {
          this.network.grantTaxAbatement(x, y, this.unionPledge);
        }
        break;

      case 'ZBA_VARIANCE':
        const reqZoning = prompt('Ask City Planning Board for permission to build (HOUSE, STORE, FACTORY):', 'STORE');
        if (reqZoning) {
          const mapped = reqZoning.toUpperCase().includes('FACT') ? 'INDUSTRIAL' : (reqZoning.toUpperCase().includes('STORE') || reqZoning.toUpperCase().includes('COMM') ? 'COMMERCIAL' : 'RESIDENTIAL');
          this.network.submitZBAVariance(x, y, mapped, 3);
        }
        break;
    }
  }

  updateHUD(state, firmId) {
    const firm = state.firms.get(firmId);
    if (!firm) return;

    if (this.elCash) this.elCash.innerText = `$${Math.round(firm.cash).toLocaleString()}`;
    if (this.elStockPrice) this.elStockPrice.innerText = `$${firm.stock.price.toFixed(2)}`;
    if (this.elNetWorth) this.elNetWorth.innerText = `$${Math.round(firm.netWorth).toLocaleString()}`;
    if (this.elInfluence) this.elInfluence.innerText = `${firm.influencePoints} ⭐`;
    if (this.elMayorName) this.elMayorName.innerText = state.municipal.mayor ? state.municipal.mayor.name : 'Mayor Sterling';
    if (this.elTickCount) this.elTickCount.innerText = `Tick ${state.tick}`;

    const marginRatio = firm.calculatedMarginRatio || 999;
    if (this.elMarginRatio) this.elMarginRatio.innerText = `${marginRatio > 500 ? '100%' : marginRatio + '%'}`;

    if (this.elMarginBadge) {
      this.elMarginBadge.className = 'status-badge';
      if (marginRatio >= 130) {
        this.elMarginBadge.innerText = 'SAFE 🛡️';
        this.elMarginBadge.classList.add('bg-emerald-500');
      } else if (marginRatio >= 110) {
        this.elMarginBadge.innerText = 'WATCH OUT ⚠️';
        this.elMarginBadge.classList.add('bg-amber-500');
      } else if (marginRatio >= 100) {
        this.elMarginBadge.innerText = 'DEBT WARNING 🚨';
        this.elMarginBadge.classList.add('bg-rose-500', 'animate-pulse');
      } else {
        this.elMarginBadge.innerText = 'BANK HELP 🛑';
        this.elMarginBadge.classList.add('bg-red-700', 'animate-bounce');
      }
    }
  }

  updateTileInspector(tile, openPanel = false) {
    const el = document.getElementById('tile-inspector-content');
    if (!el || !tile) return;

    const district = this.network.gameState.districts.find(d => d.id === tile.districtId);
    const owner = tile.ownerId ? this.network.gameState.firms.get(tile.ownerId) : null;

    const speechText = `Tile coordinates: ${tile.x}, ${tile.y}. Neighborhood: ${district ? district.name : 'District ' + tile.districtId}. Tile value is ${tile.landValue} dollars. People happiness is ${tile.desirability} out of 100. Dirty smoke is ${tile.pollution} percent. Owner is ${owner ? owner.name : 'unowned'}. ${tile.groundBuilding ? 'Building: ' + tile.groundBuilding.name + '. Rent money is ' + tile.groundBuilding.rentIncome + ' dollars each tick.' : ''} ${tile.floatingBuilding ? 'Floating sky city is hovering at Z equals ' + Math.round(tile.floatingBuilding.current_z || 64) + '.' : ''}`;

    let html = `
      <div class="space-y-2 text-xs">
        <div class="flex justify-between items-center border-b border-slate-700 pb-1">
          <div class="flex items-center gap-1">
            <span class="font-bold text-sky-400">Tile (${tile.x}, ${tile.y})</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechText.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <span class="text-slate-400">${district ? district.name : 'District ' + tile.districtId}</span>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <div><span class="text-slate-400">Tile Price:</span> <span class="font-semibold text-emerald-400">$${tile.landValue.toLocaleString()}</span></div>
          <div><span class="text-slate-400">Happiness:</span> <span class="font-semibold text-amber-300">${tile.desirability}/100 ⭐</span></div>
          <div><span class="text-slate-400">Dirty Smoke:</span> <span class="font-semibold text-rose-400">${tile.pollution}%</span></div>
          <div><span class="text-slate-400">Safety Need:</span> <span class="font-semibold text-orange-400">${tile.crime}%</span></div>
          <div class="col-span-2"><span class="text-slate-400">Owner:</span> <span class="font-semibold text-sky-300">${owner ? owner.name : 'Town Unowned (Available)'}</span></div>
        </div>
    `;

    if (tile.groundBuilding) {
      const gb = tile.groundBuilding;
      html += `
        <div class="p-2 rounded bg-slate-800/80 border border-slate-700 mt-2">
          <div class="font-bold text-emerald-300 flex items-center justify-between">
            <span>🏠 ${gb.name}</span>
            <span class="text-[10px] text-sky-400">Level ${gb.level}</span>
          </div>
          <div class="text-slate-300 mt-1">Rent Earned: <span class="text-emerald-400 font-bold">+$${gb.rentIncome}/tick</span></div>
          <div class="text-slate-300">Workers: <span class="${gb.unionBuilt ? 'text-emerald-400' : 'text-amber-400'}">${gb.unionBuilt ? '👷‍♂️ Helper Workers (Safe)' : '⚡ No Union (Strike Risk)'}</span></div>
          ${gb.isUnderStrike ? '<div class="text-rose-500 font-bold mt-1">⚠️ WORKERS ON STRIKE! (No Rent)</div>' : ''}
          ${gb.taxAbatedUntil > 0 ? '<div class="text-emerald-400 font-bold mt-1">🎉 10-Year Free Taxes Active!</div>' : ''}
        </div>
      `;
    }

    if (tile.floatingBuilding) {
      const fb = tile.floatingBuilding;
      html += `
        <div class="p-2 rounded bg-indigo-950/80 border border-cyan-500/50 mt-2">
          <div class="font-bold text-cyan-300 flex items-center justify-between">
            <span>🛸 ${fb.name}</span>
            <span class="text-[10px] text-purple-300">Level 4</span>
          </div>
          <div class="text-slate-300 mt-1">Floating Height: <span class="text-cyan-400 font-bold">Z=${Math.round(fb.current_z || 64)} in the air</span></div>
          <div class="text-slate-300">Safety Stability: <span class="${fb.stability > 50 ? 'text-emerald-400' : 'text-rose-500 font-bold'}">${fb.stability}%</span></div>
          <div class="text-slate-300">Clean Air: <span class="text-emerald-300">Immune to ground smoke!</span></div>
          <div class="text-slate-300">Rent Earned: <span class="text-emerald-400 font-bold">+$${fb.rentIncome}/tick</span></div>
        </div>
      `;
    }

    html += `</div>`;
    el.innerHTML = html;
  }

  renderSidebar(state, firmId) {
    const firm = state.firms.get(firmId);
    if (!firm) return;

    if (this.activeTab === 'STOCKS') {
      this.renderStockMarketTab(state, firm);
    } else if (this.activeTab === 'MARGIN') {
      this.renderMarginTab(state, firm);
    } else if (this.activeTab === 'POLITICS') {
      this.renderPoliticsTab(state, firm);
    } else if (this.activeTab === 'RESOURCES') {
      this.renderResourcesTab(state, firm);
    } else if (this.activeTab === 'ADVISORS') {
      this.renderAdvisorTab(state, firm);
    }

    this.renderNewsFeed(state);
  }

  renderStockMarketTab(state, myFirm) {
    const el = document.getElementById('tab-stocks');
    if (!el) return;

    const speechHeader = `Stock Market and Companies! Your company is named ${myFirm.name}. Each slice of your company is worth ${myFirm.stock.price.toFixed(2)} dollars. When you build more houses and earn rent, your company slices become worth more money! You can also buy slices of other companies.`;

    let html = `
      <div class="space-y-4">
        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700">
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-300 font-bold">👑 Your Company: ${myFirm.name}</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechHeader.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-2xl font-bold text-sky-400">$${myFirm.stock.price.toFixed(2)} <span class="text-xs text-slate-400">/ slice</span></span>
            <span class="text-xs text-emerald-400 font-bold">Real Value: $${myFirm.stock.nav.toFixed(2)}</span>
          </div>
          <div class="text-[11px] text-slate-300 mt-2 leading-tight">
            💡 <strong>Kid Rule:</strong> Your company slice price goes UP as you buy land, build shops, and earn rent!
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-xs font-bold text-slate-300 uppercase">🏢 Other City Builders</span>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
    `;

    const firmsArray = Array.from(state.firms.values()).sort((a, b) => b.netWorth - a.netWorth).slice(0, 12);

    for (const f of firmsArray) {
      const owned = myFirm.shareHoldings[f.id] || 0;
      const votingPercent = ((owned / (f.stock.totalShares || 100000)) * 100).toFixed(1);
      const isMe = (f.id === myFirm.id);
      const fSpeech = `${f.name}. Slice price: ${f.stock.price.toFixed(2)} dollars. You own ${owned} slices, which is ${votingPercent} percent.`;

      html += `
        <div class="p-2.5 rounded bg-slate-900/80 border ${isMe ? 'border-sky-500' : 'border-slate-800'} flex flex-col gap-1.5">
          <div class="flex justify-between items-center">
            <div class="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${f.color}"></span>
              ${f.name} ${isMe ? '<span class="text-[10px] text-sky-400 font-bold">(YOU)</span>' : ''}
              <button class="tts-btn-small" onclick="SpeechHelper.speak('${fSpeech.replace(/'/g, "\\'")}')">🔊</button>
            </div>
            <div class="text-xs font-bold text-sky-400">$${f.stock.price.toFixed(2)}</div>
          </div>
          <div class="flex justify-between items-center text-[11px] text-slate-400">
            <span>You Own: <strong class="text-amber-400">${owned.toLocaleString()} slices (${votingPercent}%)</strong></span>
          </div>
          <div class="flex gap-1.5 mt-1">
            <button onclick="window.ui.tradeStock('${f.id}', 100, true)" class="flex-1 py-1 px-2 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white">Buy 100 Slices</button>
            <button onclick="window.ui.tradeStock('${f.id}', 100, false)" class="flex-1 py-1 px-2 text-[10px] font-bold rounded bg-slate-700 hover:bg-slate-600 text-white" ${owned < 100 ? 'disabled' : ''}>Sell 100</button>
            ${!isMe ? `<button onclick="window.ui.takeover('${f.id}')" class="py-1 px-2 text-[10px] font-bold rounded ${votingPercent > 50 ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}" title="Buy whole company when you own over 50%">Take Over</button>` : ''}
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    el.innerHTML = html;
  }

  renderMarginTab(state, myFirm) {
    const el = document.getElementById('tab-margin');
    if (!el) return;

    const loan = myFirm.marginLoan ? myFirm.marginLoan.borrowedAmount : 0;
    const equity = myFirm.netWorth;
    const cash = myFirm.cash;
    const maxLeverage = Math.max(0, Math.round(equity * 0.70));
    const availableToBorrow = Math.max(0, maxLeverage - loan);
    const loanPercentUsed = maxLeverage > 0 ? Math.min(100, Math.round((loan / maxLeverage) * 100)) : 0;
    const safetyBufferPercent = 100 - loanPercentUsed;

    const speechMargin = `Bank Loans and Safe Money Meter! You have ${Math.round(cash).toLocaleString()} dollars in cash. You borrowed ${loan.toLocaleString()} dollars from the bank. Your company has ${equity.toLocaleString()} dollars in collateral wealth. You can still borrow up to ${availableToBorrow.toLocaleString()} dollars. Keep your safety meter in the green!`;

    let html = `
      <div class="space-y-3.5 text-xs">
        <!-- Top Summary Card -->
        <div class="p-3.5 rounded-xl bg-slate-800/95 border border-slate-700 space-y-3 shadow-lg">
          <div class="flex justify-between items-center">
            <span class="text-xs text-sky-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              🏦 Bank Loans & Collateral
            </span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechMargin.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span class="text-slate-400 block text-[10px] font-bold">💵 Cash in Hand (Spendable):</span>
              <span class="text-base font-black text-emerald-400">$${Math.round(cash).toLocaleString()}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span class="text-slate-400 block text-[10px] font-bold">💳 Bank Debt (Borrowed):</span>
              <span class="text-base font-black ${loan > 0 ? 'text-rose-400' : 'text-slate-400'}">$${loan.toLocaleString()}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span class="text-slate-400 block text-[10px] font-bold">💎 Total Collateral Wealth:</span>
              <span class="text-sm font-bold text-indigo-300">$${equity.toLocaleString()}</span>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span class="text-slate-400 block text-[10px] font-bold">🛡️ Max Can Still Borrow:</span>
              <span class="text-sm font-bold text-sky-400">$${availableToBorrow.toLocaleString()}</span>
            </div>
          </div>

          <!-- Safe Money Health Bar -->
          <div class="space-y-1.5 pt-1">
            <div class="flex justify-between text-[11px]">
              <span class="text-slate-300 font-bold">Safety Buffer:</span>
              <span class="font-black ${safetyBufferPercent >= 50 ? 'text-emerald-400' : (safetyBufferPercent >= 20 ? 'text-amber-400' : 'text-rose-500')}">
                ${safetyBufferPercent}% Safe Buffer (${loanPercentUsed}% Loan Used)
              </span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div class="h-2 rounded-full ${safetyBufferPercent >= 50 ? 'bg-emerald-500' : (safetyBufferPercent >= 20 ? 'bg-amber-500' : 'bg-rose-600')}" style="width: ${Math.max(5, safetyBufferPercent)}%"></div>
            </div>
            <div class="flex justify-between text-[9px] text-slate-400 font-semibold">
              <span class="text-rose-400">🔴 High Debt (Danger)</span>
              <span class="text-amber-400">🟡 Moderate Loan</span>
              <span class="text-emerald-400">🟢 Super Safe</span>
            </div>
          </div>
        </div>

        <!-- Borrow Quick Actions -->
        <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
          <div class="font-bold text-slate-200 flex justify-between items-center">
            <span>➕ Borrow Cash against Stock</span>
            <span class="text-[10px] text-slate-400 font-normal">70% Loan-to-Value Limit</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button onclick="window.ui.borrow(10000)" class="py-2 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow transition-all ${availableToBorrow < 10000 ? 'opacity-50 cursor-not-allowed' : ''}">+$10,000</button>
            <button onclick="window.ui.borrow(25000)" class="py-2 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow transition-all ${availableToBorrow < 25000 ? 'opacity-50 cursor-not-allowed' : ''}">+$25,000</button>
            <button onclick="window.ui.borrow(50000)" class="py-2 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow transition-all ${availableToBorrow < 50000 ? 'opacity-50 cursor-not-allowed' : ''}">+$50,000</button>
          </div>
        </div>

        <!-- Repay Quick Actions -->
        <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
          <div class="font-bold text-slate-200 flex justify-between items-center">
            <span>➖ Pay Back Bank Debt</span>
            <span class="text-[10px] text-slate-400 font-normal">Current Debt: $${loan.toLocaleString()}</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button onclick="window.ui.repay(10000)" class="py-2 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow transition-all ${loan <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">-$10,000</button>
            <button onclick="window.ui.repay(25000)" class="py-2 px-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs shadow transition-all ${loan <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">-$25,000</button>
            <button onclick="window.ui.repay(${loan})" class="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow transition-all ${loan <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">Pay All Debt</button>
          </div>
        </div>

        <!-- 5th Grade Pedagogical Rule Card -->
        <div class="p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/60 space-y-1 text-slate-200 text-[11px] leading-relaxed">
          <div class="font-extrabold text-indigo-300 flex items-center gap-1">
            <span>💡 How Borrowing Against Stock Works:</span>
          </div>
          <p>• When you click <strong>Borrow $25,000</strong>, the bank gives you <strong>$25,000 in cash</strong> right into your wallet.</p>
          <p>• Your <strong>Total Wealth</strong> stays the same because cash (+25k) and bank debt (-25k) balance out.</p>
          <p>• Use your new cash to buy land and build high-rise towers that earn rent!</p>
        </div>
      </div>
    `;
    el.innerHTML = html;
  }

  renderPoliticsTab(state, myFirm) {
    const el = document.getElementById('tab-politics');
    if (!el) return;

    const municipal = state.municipal;
    const isMayor = municipal.mayor && municipal.mayor.firmId === myFirm.id;

    const speechPolitics = `City Hall and the 10 Neighborhoods! Each neighborhood has a leader who can say yes or no to big factories or floating cities. You can spend 50 Respect Points to override their rule, or run in elections to become the leader!`;

    let html = `
      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-200">👑 Town Mayor Office</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechPolitics.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <div class="text-[11px] text-slate-300">Mayor: <span class="text-amber-300 font-bold">${isMayor ? 'YOU ARE MAYOR!' : municipal.mayor.name}</span></div>
          <div class="text-[11px] text-slate-300">Town Treasury: <span class="text-emerald-400 font-bold">$${municipal.treasury.toLocaleString()}</span></div>
        </div>

        <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">10 Neighborhood Council Leaders</div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
    `;

    for (const seat of municipal.councilSeats) {
      const isMySeat = (seat.holderFirmId === myFirm.id);
      const seatSpeech = `${seat.districtName}. Leader is ${seat.holderName}, personality is ${seat.trait}.`;

      html += `
        <div class="p-2 rounded bg-slate-900/80 border ${isMySeat ? 'border-emerald-500' : 'border-slate-800'} flex justify-between items-center">
          <div>
            <div class="font-semibold text-slate-200 flex items-center gap-1">
              <span>${seat.districtName}</span>
              <button class="tts-btn-small" onclick="SpeechHelper.speak('${seatSpeech.replace(/'/g, "\\'")}')">🔊</button>
            </div>
            <div class="text-[10px] text-slate-400">${seat.holderName} (${seat.trait})</div>
          </div>
          <div class="flex items-center gap-1">
            ${isMySeat ? '<span class="text-[10px] font-bold text-emerald-400">YOUR SEAT</span>' : `<button onclick="window.ui.overrideVeto(${seat.districtId})" class="py-1 px-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold" title="Spend 50 Respect Points to change leader's mind">Override (50 ⭐)</button>`}
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    el.innerHTML = html;
  }

  renderResourcesTab(state, myFirm) {
    const el = document.getElementById('tab-resources');
    if (!el) return;

    const res = state.resources;
    const foreign = state.municipal.foreignRelations;

    const speechResources = `Building Materials and World Friends! Concrete, Steel, and Wood are used for ground buildings. Super Floating Crystals and Energy Wire are rare materials used to keep Floating Sky Cities in the air! If other countries block crystals, sign a Peace Treaty to keep prices low.`;

    let html = `
      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-300 font-bold uppercase">🌐 World Trade Friends (${foreign.nation})</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechResources.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <div class="flex justify-between items-center text-[11px]">
            <span class="text-slate-300">Trade Status:</span>
            <span class="font-bold ${foreign.embargoActive ? 'text-rose-500' : 'text-emerald-400'}">${foreign.embargoActive ? 'TRADE BLOCKED 🛑' : 'FRIENDLY TRADE 🤝'}</span>
          </div>

          <div class="flex gap-2 pt-2 border-t border-slate-700">
            <button onclick="window.ui.diplomacy()" class="flex-1 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]">🕊️ Sign Peace Treaty ($250k)</button>
            <button onclick="window.ui.military()" class="flex-1 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px]">⚔️ Security Patrol ($600k)</button>
          </div>
        </div>

        <div class="text-xs font-bold text-slate-300 uppercase">📦 Materials Store</div>
        <div class="space-y-2">
    `;

    for (const key of Object.keys(res)) {
      const item = res[key];
      const invCount = (myFirm.inventory && myFirm.inventory[key]) || 0;
      let kidName = item.name;
      if (key === 'rareEarth') kidName = '🔮 Super Floating Crystals';
      if (key === 'superconductors') kidName = '⚡ Energy Wire';
      if (key === 'concrete') kidName = '🏗️ Strong Concrete';
      if (key === 'steel') kidName = '⚙️ Structural Steel';
      if (key === 'timber') kidName = '🌲 Forest Wood';

      html += `
        <div class="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
          <div>
            <div class="font-semibold text-slate-200">${kidName}</div>
            <div class="text-[10px] text-slate-400">In Backpack: <strong class="text-amber-300">${invCount.toLocaleString()} units</strong></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <div class="font-bold text-emerald-400 text-xs">$${item.spotPrice} each</div>
            </div>
            <button onclick="window.ui.buyRes('${key}', 10)" class="py-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]">+10 Buy</button>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    el.innerHTML = html;
  }

  renderAdvisorTab(state, myFirm) {
    const el = document.getElementById('tab-advisors');
    if (!el) return;

    let html = `
      <div class="space-y-3 text-xs">
        <div class="text-xs font-bold text-slate-300 uppercase tracking-wider">🎓 Friendly City Helpers</div>
    `;

    for (const key of Object.keys(this.advisor.advisors)) {
      const adv = this.advisor.advisors[key];
      const advSpeech = `${adv.name}, ${adv.title}. ${adv.intro}`;
      html += `
        <div class="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${adv.avatar}</span>
              <div>
                <div class="font-bold text-slate-100" style="color:${adv.color}">${adv.name}</div>
                <div class="text-[10px] text-slate-400">${adv.title}</div>
              </div>
            </div>
            <button class="tts-btn" onclick="SpeechHelper.speak('${advSpeech.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed italic">"${adv.intro}"</p>
        </div>
      `;
    }

    html += `</div>`;
    el.innerHTML = html;
  }

  renderNewsFeed(state) {
    const el = document.getElementById('news-ticker-content');
    if (!el || !state.news) return;

    const items = state.news.slice(0, 6);
    let html = '';
    for (const n of items) {
      let badgeCol = 'bg-sky-600';
      if (n.type === 'critical') badgeCol = 'bg-rose-600 animate-pulse';
      else if (n.type === 'warning') badgeCol = 'bg-amber-600';
      else if (n.type === 'success') badgeCol = 'bg-emerald-600';

      const nSpeech = `City News: ${n.headline}`;

      html += `
        <div class="flex items-center justify-between py-1 border-b border-slate-800 text-[11px]">
          <div class="flex items-center gap-1.5 overflow-hidden">
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${badgeCol}">${n.type.toUpperCase()}</span>
            <span class="text-slate-300 truncate">${n.headline}</span>
          </div>
          <button class="tts-btn-small flex-shrink-0" onclick="SpeechHelper.speak('${nSpeech.replace(/'/g, "\\'")}')">🔊</button>
        </div>
      `;
    }
    el.innerHTML = html;
  }

  checkMarginAlerts(state, firmId) {
    const firm = state.firms.get(firmId);
    if (!firm) return;

    if (firm.marginStatus === 'MARGIN_CALL' && !this.modalMarginCall.classList.contains('active')) {
      const guidance = this.advisor.getMarginCallResolutionOptions(firm, state);
      this.showMarginCallModal(guidance);
    }
  }

  showMarginCallModal(guidance) {
    if (!guidance || !this.modalMarginCall) return;
    document.getElementById('margin-modal-title').innerText = guidance.title;
    document.getElementById('margin-modal-explanation').innerText = guidance.explanation;

    const speechBtn = document.getElementById('margin-modal-tts');
    if (speechBtn) {
      speechBtn.onclick = () => SpeechHelper.speak(guidance.speechText || guidance.explanation);
    }

    const optsContainer = document.getElementById('margin-modal-options');
    optsContainer.innerHTML = '';

    guidance.options.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 cursor-pointer flex justify-between items-center transition-all';
      div.innerHTML = `
        <div>
          <div class="font-bold text-xs text-emerald-400">${opt.label}</div>
          <div class="text-[11px] text-slate-300 mt-0.5">${opt.actionDesc}</div>
        </div>
        <span class="text-base text-emerald-400 font-bold">👉</span>
      `;
      div.onclick = () => {
        if (opt.actionType === 'REPAY_LOAN') {
          this.network.repayMarginLoan(opt.amount);
        } else if (opt.actionType === 'NAVIGATE_STOCKS') {
          document.querySelector('[data-tab="STOCKS"]').click();
        }
        this.modalMarginCall.classList.add('hidden');
      };
      optsContainer.appendChild(div);
    });

    this.modalMarginCall.classList.remove('hidden');
    // Only auto read if enabled in Settings
    SpeechHelper.speakIfAuto(guidance.speechText || guidance.explanation);
  }

  showVetoModal(districtId, reason) {
    if (!this.modalVeto) return;
    const advice = this.advisor.getVetoAdvice(districtId, reason);
    document.getElementById('veto-modal-title').innerText = advice.title;
    document.getElementById('veto-modal-reason').innerText = advice.reason;
    document.getElementById('veto-modal-explanation').innerText = advice.explanation;

    const speechBtn = document.getElementById('veto-modal-tts');
    if (speechBtn) {
      speechBtn.onclick = () => SpeechHelper.speak(advice.speechText || advice.explanation);
    }

    const solEl = document.getElementById('veto-modal-solutions');
    solEl.innerHTML = advice.solutions.map(s => `<div>${s}</div>`).join('');

    this.modalVeto.classList.remove('hidden');
    SpeechHelper.speakIfAuto(advice.speechText || advice.explanation);
  }

  showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-2xl z-50 transition-opacity duration-300 ${type === 'error' ? 'bg-rose-600' : (type === 'success' ? 'bg-emerald-600' : 'bg-slate-800 border border-slate-700')}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  appendChatMessage(chat) {
    const el = document.getElementById('chat-messages');
    if (!el) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = 'text-[11px] leading-tight';
    msgDiv.innerHTML = `<span class="font-bold" style="color:${chat.color}">${chat.senderName}:</span> <span class="text-slate-200">${chat.message}</span>`;
    el.appendChild(msgDiv);
    el.scrollTop = el.scrollHeight;
  }

  tradeStock(targetFirmId, count, isBuy) {
    const myFirm = this.network.gameState.firms.get(this.network.firmId);
    const targetFirm = this.network.gameState.firms.get(targetFirmId);
    if (myFirm && targetFirm) {
      const price = targetFirm.stock.price;
      const totalCost = Math.round(price * count);
      if (isBuy) {
        if (myFirm.cash < totalCost) {
          this.showToast(`Not enough cash! Need $${totalCost.toLocaleString()}`, 'error');
          SpeechHelper.speakIfAuto('You do not have enough cash to buy those slices.');
          return;
        }
        myFirm.cash -= totalCost;
        myFirm.shareHoldings[targetFirmId] = (myFirm.shareHoldings[targetFirmId] || 0) + count;
        this.showToast(`📈 Bought ${count} slices of ${targetFirm.name} for $${totalCost.toLocaleString()}!`, 'success');
        SpeechHelper.speakIfAuto(`Bought ${count} slices of ${targetFirm.name}.`);
      } else {
        const owned = myFirm.shareHoldings[targetFirmId] || 0;
        if (owned < count) {
          this.showToast('You do not own that many slices to sell!', 'error');
          return;
        }
        myFirm.cash += totalCost;
        myFirm.shareHoldings[targetFirmId] -= count;
        this.showToast(`📉 Sold ${count} slices of ${targetFirm.name} for $${totalCost.toLocaleString()}!`, 'success');
        SpeechHelper.speakIfAuto(`Sold ${count} slices of ${targetFirm.name}.`);
      }
      this.updateHUD(this.network.gameState, this.network.firmId);
      this.renderStockMarketTab(this.network.gameState, myFirm);
    }
    this.network.tradeStock(targetFirmId, count, isBuy);
  }

  takeover(targetFirmId) {
    const targetFirm = this.network.gameState.firms.get(targetFirmId);
    if (targetFirm) {
      SpeechHelper.speakIfAuto(`Attempting hostile takeover of ${targetFirm.name}!`);
    }
    this.network.hostileTakeover(targetFirmId);
  }

  borrow(amount) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (firm) {
      const maxLeverage = Math.max(0, Math.round(firm.netWorth * 0.70));
      const currentLoan = firm.marginLoan ? firm.marginLoan.borrowedAmount : 0;
      const available = Math.max(0, maxLeverage - currentLoan);

      if (amount > available) {
        this.showToast(`Cannot borrow $${amount.toLocaleString()}! Max available limit is $${available.toLocaleString()}`, 'error');
        SpeechHelper.speakIfAuto(`Sorry, the bank cannot lend more than your safe limit of ${available.toLocaleString()} dollars.`);
        return;
      }

      // Optimistic client update for instant response
      firm.cash += amount;
      if (!firm.marginLoan) firm.marginLoan = { borrowedAmount: 0, collateralShares: 0 };
      firm.marginLoan.borrowedAmount += amount;
      this.updateHUD(this.network.gameState, this.network.firmId);
      this.renderMarginTab(this.network.gameState, firm);

      this.showToast(`💵 Borrowed $${amount.toLocaleString()}! Spendable Cash in Hand: $${Math.round(firm.cash).toLocaleString()}`, 'success');
      SpeechHelper.speakIfAuto(`You borrowed ${amount.toLocaleString()} dollars! Your cash is now ${Math.round(firm.cash).toLocaleString()} dollars.`);
    }
    this.network.takeMarginLoan(amount);
  }

  repay(amount) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (firm) {
      const currentLoan = firm.marginLoan ? firm.marginLoan.borrowedAmount : 0;
      if (currentLoan <= 0) {
        this.showToast('You have no bank debt to pay back!', 'info');
        return;
      }
      const actualRepay = Math.min(amount, currentLoan, firm.cash);
      if (actualRepay <= 0) {
        this.showToast('Not enough cash in hand to pay back loan!', 'error');
        SpeechHelper.speakIfAuto('You do not have enough cash in hand to pay back the loan.');
        return;
      }

      // Optimistic client update
      firm.cash -= actualRepay;
      firm.marginLoan.borrowedAmount -= actualRepay;
      this.updateHUD(this.network.gameState, this.network.firmId);
      this.renderMarginTab(this.network.gameState, firm);

      this.showToast(`💳 Paid back $${actualRepay.toLocaleString()} of bank loan! Remaining Debt: $${firm.marginLoan.borrowedAmount.toLocaleString()}`, 'success');
      SpeechHelper.speakIfAuto(`Paid back ${actualRepay.toLocaleString()} dollars of debt.`);
    }
    this.network.repayMarginLoan(amount);
  }

  overrideVeto(districtId) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (firm && firm.influencePoints < 50) {
      this.showToast('Need 50 Respect Points (⭐) to override a neighborhood veto!', 'error');
      SpeechHelper.speakIfAuto('You need 50 Respect Points to change the neighborhood leader mind.');
      return;
    }
    this.network.overrideVeto(districtId);
  }

  buyRes(key, amt) {
    this.network.buyResource(key, amt);
  }

  diplomacy() {
    this.network.mayorDiplomacy();
  }

  military() {
    this.network.mayorMilitary();
  }
}

window.UIController = UIController;
