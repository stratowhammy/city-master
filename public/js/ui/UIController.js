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

    this.selectedDrawerFirmId = 'firm_player_1';
    this.stockChartTimeframe = 500;
    this.stockChartHoverIdx = -1;
    this.isStockDrawerOpen = false;

    this.initDOM();
    this.initEventListeners();
    this.initCanvasInteractions();
    this.initStockDrawerEvents();
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

    // Profile & Company Registration Modal
    const modalProfile = document.getElementById('modal-profile');
    const btnOpenProfile = document.getElementById('btn-open-profile');
    const profileCloseBtn = document.getElementById('profile-close-btn');
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileColorInput = document.getElementById('profile-color-input');

    if (btnOpenProfile) {
      btnOpenProfile.addEventListener('click', () => {
        const myFirm = this.network.gameState && this.network.gameState.firms && this.network.gameState.firms.get(this.network.firmId);
        if (myFirm && profileNameInput) profileNameInput.value = myFirm.name;
        if (myFirm && profileColorInput) profileColorInput.value = myFirm.color || '#3b82f6';
        if (modalProfile) modalProfile.classList.remove('hidden');
      });
    }

    if (profileCloseBtn) {
      profileCloseBtn.addEventListener('click', () => {
        if (modalProfile) modalProfile.classList.add('hidden');
      });
    }

    if (profileSaveBtn) {
      profileSaveBtn.addEventListener('click', () => {
        const name = (profileNameInput && profileNameInput.value.trim()) || 'Custom Tycoon Co';
        const color = (profileColorInput && profileColorInput.value) || '#3b82f6';
        this.network.createProfile(name, color);
        if (modalProfile) modalProfile.classList.add('hidden');
        this.showToast(`🏢 Company Profile "${name}" registered on the Stock Exchange!`, 'success');
        SpeechHelper.speakIfAuto(`Profile ${name} registered on the stock exchange.`);
      });
    }

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

    if (this.isStockDrawerOpen) {
      this.renderStockDrawer();
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

    const speechHeader = `Stock Market and Companies! Your company is named ${myFirm.name}. Each share of your company stock is worth ${myFirm.stock.price.toFixed(2)} dollars. When you build more houses and earn rent, your company stock price becomes worth more money! You can also buy and sell stocks of other companies and view 500-tick price graphs.`;

    let html = `
      <div class="space-y-4">
        <!-- Player Firm Stock Card -->
        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700">
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-300 font-bold">👑 Your Company: ${myFirm.name}</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechHeader.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-2xl font-bold text-sky-400">$${myFirm.stock.price.toFixed(2)} <span class="text-xs text-slate-400">/ share</span></span>
            <span class="text-xs text-emerald-400 font-bold">NAV: $${myFirm.stock.nav.toFixed(2)}</span>
          </div>
          <div class="text-[11px] text-slate-300 mt-2 leading-tight">
            💡 <strong>Kid Rule:</strong> Your company stock price goes UP as you buy land, build shops, and earn rent!
          </div>
          <button onclick="window.ui.openStockDrawer('${myFirm.id}')" class="w-full mt-2.5 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all">
            📊 Open 500-Tick Stock Price Graph Drawer
          </button>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-xs font-bold text-slate-300 uppercase">🏢 City Stock Exchange (${firmsArray.length} Companies)</span>
          <span class="text-[10px] text-slate-400">Click to graph</span>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
    `;

    for (const f of firmsArray) {
      const owned = (myFirm.shareHoldings && myFirm.shareHoldings[f.id]) || 0;
      const votingPercent = ((owned / (f.stock.totalShares || 100000)) * 100).toFixed(1);
      const isMe = (f.id === myFirm.id);
      const isTraded = (f.isActivelyTraded !== false);
      const fSpeech = `${f.name}. Stock price: ${f.stock.price.toFixed(2)} dollars. ${isTraded ? 'Actively traded on exchange.' : 'Awaiting property development to unlock active trading.'} You own ${owned} shares, which is ${votingPercent} percent.`;

      html += `
        <div class="p-2.5 rounded bg-slate-900/80 border ${isMe ? 'border-sky-500' : 'border-slate-800'} hover:border-slate-600 transition-all flex flex-col gap-1.5">
          <div class="flex justify-between items-center cursor-pointer" onclick="window.ui.openStockDrawer('${f.id}')">
            <div class="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${f.color}"></span>
              <span class="hover:text-sky-300 transition-colors">${f.name}</span> ${isMe ? '<span class="text-[10px] text-sky-400 font-bold">(YOU)</span>' : ''}
              <button class="tts-btn-small" onclick="event.stopPropagation(); SpeechHelper.speak('${fSpeech.replace(/'/g, "\\'")}')">🔊</button>
            </div>
            <div class="text-right">
              <div class="text-xs font-bold text-sky-400">$${f.stock.price.toFixed(2)}</div>
              <span class="text-[9px] font-bold px-1.5 py-0.2 rounded ${isTraded ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                ${isTraded ? '🟢 Active' : '⏳ Awaiting Dev'}
              </span>
            </div>
          </div>
          <div class="flex justify-between items-center text-[11px] text-slate-400">
            <span>You Own: <strong class="text-amber-400">${owned.toLocaleString()} shares (${votingPercent}%)</strong></span>
            <button onclick="window.ui.openStockDrawer('${f.id}')" class="text-[10px] font-bold text-sky-400 hover:text-sky-300 underline">📊 500t Graph</button>
          </div>
          <div class="flex gap-1.5 mt-1">
            ${isTraded ? `
              <button onclick="window.ui.tradeStock('${f.id}', 100, true)" class="flex-1 py-1 px-2 text-[10px] font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">Buy 100</button>
              <button onclick="window.ui.tradeStock('${f.id}', 100, false)" class="flex-1 py-1 px-2 text-[10px] font-bold rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors" ${owned < 100 ? 'disabled' : ''}>Sell 100</button>
            ` : `
              <button disabled class="flex-1 py-1 px-2 text-[10px] font-bold rounded bg-slate-800/80 text-slate-500 cursor-not-allowed" title="Trading locked until company develops properties">🔒 Trading Awaiting Initial Development</button>
            `}
            ${(!isMe && isTraded) ? `<button onclick="window.ui.takeover('${f.id}')" class="py-1 px-2 text-[10px] font-bold rounded ${votingPercent > 50 ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}" title="Buy whole company when you own over 50%">Take Over</button>` : ''}
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
    const activeBill = municipal.activeBill;
    const activePolicies = municipal.activePolicies || [];
    const bribeRisk = myFirm.bribeAuditRisk || 0;

    const policiesList = [
      {
        id: 'POLICY_COMMERCIAL_BOOM',
        name: 'Commercial Boom Act',
        icon: '🏪',
        badge: '+30% Rent / +15% Land',
        desc: '+30% Commercial rental income city-wide and +15% commercial land value.',
        support: 44
      },
      {
        id: 'POLICY_INDUSTRIAL_DEREG',
        name: 'Industrial Deregulation & Freight Subsidy',
        icon: '🏭',
        badge: '+35% Rent / -20% Smoke',
        desc: '+35% Factory rent income and -20% pollution spread to nearby houses.',
        support: 38
      },
      {
        id: 'POLICY_RESIDENTIAL_SUBSIDY',
        name: 'Residential Homestead & Tenant Subsidy',
        icon: '🏡',
        badge: '+25% Rent / +20 Joy',
        desc: '+25% Residential rent income and +20 family happiness/desirability.',
        support: 48
      },
      {
        id: 'POLICY_TAX_HOLIDAY',
        name: 'Municipal 10-Year Tax Holiday',
        icon: '📜',
        badge: '50% Off Taxes',
        desc: 'Cuts municipal property tax rate in half (down to 2.25%) for 1,200 ticks.',
        support: 35
      },
      {
        id: 'POLICY_MARITIME_CORRIDOR',
        name: 'Maritime Trade Corridor Act',
        icon: '🚢',
        badge: '+50% Port Trade',
        desc: 'Maritime Ports grant +50% trade throughput and rent within 8 tiles.',
        support: 52
      },
      {
        id: 'POLICY_BOULEVARD_MODERN',
        name: 'Boulevard & Infrastructure Modernization',
        icon: '🚧',
        badge: '+20% Land / Free Roads',
        desc: '+20% land value along multi-lane avenues with zero public road upkeep.',
        support: 46
      }
    ];

    const speechPolitics = `City Hall Legislative Chamber and Policies! You can choose lucrative policies to pass for your company, lobby councilmembers using Respect Points, or offer secret bribes. Watch the countdown clock to vote, and remember that final tallies have a plus or minus 10 percent uncertainty!`;

    let html = `
      <div class="space-y-3.5 text-xs">
        <!-- Mayoral Summary Header -->
        <div class="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-200 flex items-center gap-1.5">
              <span>🏛️ City Hall & Legislative Chamber</span>
            </span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechPolitics.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>
          <div class="flex justify-between text-[11px] text-slate-300">
            <span>Mayor: <strong class="text-amber-300">${isMayor ? 'YOU ARE MAYOR! 👑' : municipal.mayor.name}</strong></span>
            <span>Treasury: <strong class="text-emerald-400">$${municipal.treasury.toLocaleString()}</strong></span>
          </div>
          <div class="text-[10px] text-slate-400 flex justify-between">
            <span>Next Election: <strong>${Math.max(0, municipal.nextElectionTick - state.tick)} ticks</strong></span>
            <span>Your Respect Points: <strong class="text-amber-400 font-bold">${myFirm.influencePoints} ⭐</strong></span>
          </div>
        </div>

        <!-- 1. Enacted Special Laws / Policies -->
        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div class="font-bold text-slate-200 text-xs flex justify-between items-center">
            <span>📜 Active City Policies Enacted (${activePolicies.length})</span>
          </div>
          ${activePolicies.length === 0 ? `
            <div class="text-[11px] text-slate-500 italic py-1">No special policies currently in effect. Propose and pass a bill below to boost your company!</div>
          ` : `
            <div class="space-y-1.5">
              ${activePolicies.map(p => {
                const rem = Math.max(0, p.expiresTick - state.tick);
                return `
                  <div class="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex justify-between items-center">
                    <div>
                      <div class="font-bold text-emerald-300 text-xs flex items-center gap-1">
                        <span>${p.icon || '📜'} ${p.name}</span>
                      </div>
                      <div class="text-[10px] text-slate-300 mt-0.5">${p.description}</div>
                    </div>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-bold shrink-0 ml-2">⏳ ${rem}t left</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 2. Legislative Bill on the Floor (Active Voting Session) OR Propose Bill -->
        ${activeBill ? `
          <!-- Active Bill Floor Session -->
          <div class="p-3.5 rounded-xl bg-indigo-950/60 border-2 border-indigo-500/80 space-y-3 shadow-lg">
            <div class="flex justify-between items-center">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400">🗳️ Floor Debate & Voting Session</span>
                <div class="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <span>${activeBill.icon || '📜'} ${activeBill.name}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-slate-400 block">Countdown to Vote</span>
                <span class="text-xs font-mono font-extrabold text-amber-300 animate-pulse">⏱️ ${Math.max(0, activeBill.voteCastTick - state.tick)} Ticks</span>
              </div>
            </div>

            <div class="text-[11px] text-slate-300 bg-slate-900/70 p-2 rounded border border-slate-800">
              ${activeBill.description}
            </div>

            <!-- Expected Vote Gauge / Slider -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-bold">
                <span class="text-slate-300">Expected Vote Support:</span>
                <span class="${activeBill.projectedVote >= 50 ? 'text-emerald-400' : 'text-rose-400'} font-extrabold text-sm">${activeBill.projectedVote}% YES</span>
              </div>
              <div class="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                <div class="h-full transition-all duration-300 ${activeBill.projectedVote >= 50 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-amber-500'}" style="width: ${activeBill.projectedVote}%"></div>
                <!-- 50% Passing Marker Line -->
                <div class="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow-sm z-10"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-semibold pt-0.5">
                <span>0%</span>
                <span class="text-amber-300">⚖️ 50% (Pass Mark)</span>
                <span>100%</span>
              </div>
              <div class="text-[10px] text-slate-400 italic">
                🎲 <strong>Vote Uncertainty:</strong> Actual vote deviates by ±10% when countdown timer expires!
              </div>
            </div>

            <!-- Lobbying Action with Respect Points Input -->
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div class="font-bold text-slate-200 text-[11px] flex justify-between items-center">
                <span>🏛️ Lobby Council with Respect Points</span>
                <span class="text-[10px] text-amber-400 font-normal">You have: ${myFirm.influencePoints} ⭐</span>
              </div>
              <div class="flex items-center gap-2">
                <input type="number" id="lobby-rp-input" value="20" min="1" max="${myFirm.influencePoints}" class="w-24 bg-slate-800 border border-slate-700 text-white font-bold text-xs px-2 py-1.5 rounded focus:outline-none focus:border-sky-500">
                <button onclick="window.ui.lobbyBill(document.getElementById('lobby-rp-input').value)" class="flex-1 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow transition-all">
                  🏛️ Spend RP to Lobby (+2.5% / 5⭐)
                </button>
              </div>
            </div>

            <!-- Cash Bribery Action -->
            <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div class="flex justify-between items-center">
                <span class="font-bold text-slate-200 text-[11px]">💰 Offer Secret Political Bribe</span>
                <span class="text-[10px] text-slate-400">Cash: <strong class="text-emerald-400">$${Math.round(myFirm.cash).toLocaleString()}</strong></span>
              </div>
              <button onclick="window.ui.bribeOfficial()" class="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all">
                💰 Offer $25,000 Bribe (+12% Vote Support)
              </button>
              <div class="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800">
                <span>Current Investigation Risk: <strong class="${bribeRisk > 25 ? 'text-rose-400' : 'text-amber-400'} font-bold">${bribeRisk.toFixed(1)}%</strong></span>
                <span class="text-slate-500">Decays 1% / 10,000 ticks</span>
              </div>
              <div class="text-[9px] text-rose-300/80 leading-tight">
                ⚠️ Each bribe increases chances of being caught by +5%. If investigated, you will be fined $50,000 and lose 30 Respect Points!
              </div>
            </div>
          </div>
        ` : `
          <!-- Propose New Policy Bill Deck -->
          <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div class="font-bold text-slate-200 text-xs flex justify-between items-center">
              <span>📜 Propose a New Policy Bill to Council</span>
              <span class="text-[10px] text-slate-400">Floor Vote: 60 Ticks</span>
            </div>
            <div class="text-[11px] text-slate-300 leading-tight">
              Select a legislative policy to advance your development and maximize company profits:
            </div>
            <select id="select-policy-bill" class="w-full bg-slate-800 text-white text-xs font-semibold p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-500">
              ${policiesList.map(p => `
                <option value="${p.id}">${p.icon} ${p.name} [${p.badge}] (Base Support: ${p.support}%)</option>
              `).join('')}
            </select>
            <button onclick="window.ui.proposeBill(document.getElementById('select-policy-bill').value)" class="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all">
              📜 Introduce Policy Bill to City Council Floor
            </button>
          </div>
        `}

        <!-- 3. 10 Neighborhood Council Leaders (Lobbying Vetoes) -->
        <div class="space-y-1.5">
          <div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex justify-between items-center">
            <span>🏛️ 10 Neighborhood Council Leaders</span>
            <span class="text-[10px] text-slate-400 font-normal">Lobby = 50 ⭐</span>
          </div>
          <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            ${municipal.councilSeats.map(seat => {
              const isMySeat = (seat.holderFirmId === myFirm.id);
              const seatSpeech = `${seat.districtName}. Leader is ${seat.holderName}, personality is ${seat.trait}.`;
              return `
                <div class="p-2 rounded-lg bg-slate-900/80 border ${isMySeat ? 'border-emerald-500' : 'border-slate-800'} flex justify-between items-center">
                  <div>
                    <div class="font-semibold text-slate-200 flex items-center gap-1">
                      <span>${seat.districtName}</span>
                      <button class="tts-btn-small" onclick="SpeechHelper.speak('${seatSpeech.replace(/'/g, "\\'")}')">🔊</button>
                    </div>
                    <div class="text-[10px] text-slate-400">${seat.holderName} (${seat.trait})</div>
                  </div>
                  <div class="flex items-center gap-1">
                    ${isMySeat ? '<span class="text-[10px] font-bold text-emerald-400">YOUR SEAT</span>' : `
                      <button onclick="window.ui.lobbyCouncilVeto(${seat.districtId})" class="py-1 px-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold shadow transition-all" title="Spend 50 Respect Points to lobby the leader">
                        🏛️ Lobby (50 ⭐)
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
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
    if (targetFirm && targetFirm.isActivelyTraded === false) {
      this.showToast(`Trading Locked: ${targetFirm.name} must purchase land and build developments to unlock stock trading!`, 'error');
      SpeechHelper.speakIfAuto(`Trading is locked. ${targetFirm.name} has not built initial developments yet.`);
      return;
    }
    if (myFirm && targetFirm) {
      const price = targetFirm.stock.price;
      const totalCost = Math.round(price * count);
      if (isBuy) {
        if (myFirm.cash < totalCost) {
          this.showToast(`Not enough cash! Need $${totalCost.toLocaleString()}`, 'error');
          SpeechHelper.speakIfAuto('You do not have enough cash to buy those shares.');
          return;
        }
        myFirm.cash -= totalCost;
        myFirm.shareHoldings[targetFirmId] = (myFirm.shareHoldings[targetFirmId] || 0) + count;
        this.showToast(`📈 Bought ${count} shares of ${targetFirm.name} for $${totalCost.toLocaleString()}!`, 'success');
        SpeechHelper.speakIfAuto(`Bought ${count} shares of ${targetFirm.name}.`);
      } else {
        const owned = myFirm.shareHoldings[targetFirmId] || 0;
        if (owned < count) {
          this.showToast('You do not own that many shares to sell!', 'error');
          return;
        }
        myFirm.cash += totalCost;
        myFirm.shareHoldings[targetFirmId] -= count;
        this.showToast(`📉 Sold ${count} shares of ${targetFirm.name} for $${totalCost.toLocaleString()}!`, 'success');
        SpeechHelper.speakIfAuto(`Sold ${count} shares of ${targetFirm.name}.`);
      }
      this.updateHUD(this.network.gameState, this.network.firmId);
      this.renderStockMarketTab(this.network.gameState, myFirm);
      if (this.isStockDrawerOpen && this.selectedDrawerFirmId === targetFirmId) {
        this.renderStockDrawer();
      }
    }
    this.network.tradeStock(targetFirmId, count, isBuy);
  }

  initStockDrawerEvents() {
    const canvas = document.getElementById('stock-chart-canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const width = canvas.width;
        const firm = this.network.gameState && this.network.gameState.firms && this.network.gameState.firms.get(this.selectedDrawerFirmId);
        if (!firm || !firm.stock || !firm.stock.history || firm.stock.history.length === 0) return;

        const history = firm.stock.history.slice(-this.stockChartTimeframe);
        const dataCount = history.length;
        if (dataCount <= 1) return;

        const padLeft = 45;
        const padRight = 20;
        const plotWidth = width - padLeft - padRight;
        const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / plotWidth));
        const idx = Math.min(dataCount - 1, Math.max(0, Math.round(ratio * (dataCount - 1))));

        this.stockChartHoverIdx = idx;
        const hoveredPrice = history[idx];
        const statEl = document.getElementById('drawer-hover-stat');
        if (statEl) {
          const totalTicks = this.network.gameState.tick || 0;
          const tickNum = Math.max(0, totalTicks - (dataCount - 1 - idx));
          statEl.innerHTML = `<span class="text-slate-400">Tick #${tickNum}:</span> <strong class="text-emerald-400">$${hoveredPrice.toFixed(2)}</strong>`;
        }
        this.drawStockChartCanvas(history, firm.color || '#38bdf8', firm.stock.price, firm.stock.nav);
      });

      canvas.addEventListener('mouseleave', () => {
        this.stockChartHoverIdx = -1;
        const statEl = document.getElementById('drawer-hover-stat');
        if (statEl) statEl.innerText = 'Hover over chart for details';
        const firm = this.network.gameState && this.network.gameState.firms && this.network.gameState.firms.get(this.selectedDrawerFirmId);
        if (firm && firm.stock && firm.stock.history) {
          const history = firm.stock.history.slice(-this.stockChartTimeframe);
          this.drawStockChartCanvas(history, firm.color || '#38bdf8', firm.stock.price, firm.stock.nav);
        }
      });
    }

    // Drawer trading buttons
    ['buy-10', 'buy-100', 'buy-500', 'buy-max', 'sell-10', 'sell-100', 'sell-500', 'sell-all'].forEach(id => {
      const btn = document.getElementById(`drawer-${id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          const firmId = this.selectedDrawerFirmId;
          const gs = this.network.gameState;
          const myFirm = gs && gs.firms && gs.firms.get(this.network.firmId);
          const targetFirm = gs && gs.firms && gs.firms.get(firmId);
          if (!myFirm || !targetFirm) return;

          const price = targetFirm.stock.price || 15;
          const owned = (myFirm.shareHoldings && myFirm.shareHoldings[firmId]) || 0;

          if (id === 'buy-10') this.tradeStock(firmId, 10, true);
          else if (id === 'buy-100') this.tradeStock(firmId, 100, true);
          else if (id === 'buy-500') this.tradeStock(firmId, 500, true);
          else if (id === 'buy-max') {
            const maxAfford = Math.floor(myFirm.cash / price);
            if (maxAfford > 0) this.tradeStock(firmId, maxAfford, true);
            else this.showToast('Not enough cash to buy any shares!', 'error');
          }
          else if (id === 'sell-10') this.tradeStock(firmId, Math.min(10, owned), false);
          else if (id === 'sell-100') this.tradeStock(firmId, Math.min(100, owned), false);
          else if (id === 'sell-500') this.tradeStock(firmId, Math.min(500, owned), false);
          else if (id === 'sell-all') {
            if (owned > 0) this.tradeStock(firmId, owned, false);
            else this.showToast('You do not own any shares of this company!', 'error');
          }
        });
      }
    });

    const takeoverBtn = document.getElementById('drawer-takeover-btn');
    if (takeoverBtn) {
      takeoverBtn.addEventListener('click', () => {
        this.takeover(this.selectedDrawerFirmId);
      });
    }

    const ttsBtn = document.getElementById('drawer-tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', () => {
        const gs = this.network.gameState;
        const f = gs && gs.firms && gs.firms.get(this.selectedDrawerFirmId);
        if (f) {
          const myFirm = gs.firms.get(this.network.firmId);
          const owned = (myFirm && myFirm.shareHoldings && myFirm.shareHoldings[f.id]) || 0;
          const msg = `${f.name}. Current stock price: ${f.stock.price.toFixed(2)} dollars. Net Asset Value: ${f.stock.nav.toFixed(2)} dollars. You own ${owned.toLocaleString()} shares. Showing ${this.stockChartTimeframe} ticks of price graph history.`;
          SpeechHelper.speak(msg);
        }
      });
    }
  }

  openStockDrawer(firmId) {
    this.selectedDrawerFirmId = firmId || this.network.firmId;
    this.isStockDrawerOpen = true;

    const drawer = document.getElementById('drawer-stock-graph');
    if (drawer) drawer.classList.remove('hidden');

    // Populate Selector Dropdown with all 50 firms
    const sel = document.getElementById('drawer-stock-selector');
    const gs = this.network.gameState;
    if (sel && gs && gs.firms) {
      const allFirms = Array.from(gs.firms.values()).sort((a, b) => a.name.localeCompare(b.name));
      sel.innerHTML = allFirms.map(f => `
        <option value="${f.id}" ${f.id === this.selectedDrawerFirmId ? 'selected' : ''}>
          ${f.name} ($${f.stock.price.toFixed(2)}) ${f.id === this.network.firmId ? '⭐ (YOU)' : ''}
        </option>
      `).join('');
    }

    this.renderStockDrawer();
  }

  closeStockDrawer() {
    this.isStockDrawerOpen = false;
    const drawer = document.getElementById('drawer-stock-graph');
    if (drawer) drawer.classList.add('hidden');
  }

  setStockChartTimeframe(ticks) {
    this.stockChartTimeframe = ticks;
    const label = document.getElementById('drawer-chart-tf-label');
    if (label) label.innerText = ticks;

    document.querySelectorAll('.chart-tf-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.ticks) === ticks);
    });

    this.renderStockDrawer();
  }

  renderStockDrawer() {
    if (!this.isStockDrawerOpen) return;

    const gs = this.network.gameState;
    if (!gs || !gs.firms) return;

    const firm = gs.firms.get(this.selectedDrawerFirmId);
    const myFirm = gs.firms.get(this.network.firmId);
    if (!firm) return;

    // Header updates
    const firmColorEl = document.getElementById('drawer-firm-color');
    if (firmColorEl) firmColorEl.style.backgroundColor = firm.color || '#38bdf8';

    const firmNameEl = document.getElementById('drawer-firm-name');
    if (firmNameEl) firmNameEl.innerText = firm.name;

    const firmIdEl = document.getElementById('drawer-firm-id');
    if (firmIdEl) firmIdEl.innerText = firm.name.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase();

    const curPriceEl = document.getElementById('drawer-current-price');
    if (curPriceEl) curPriceEl.innerText = `$${firm.stock.price.toFixed(2)}`;

    const navEl = document.getElementById('drawer-nav-price');
    if (navEl) navEl.innerText = `$${firm.stock.nav.toFixed(2)}`;

    // Calculate 500-tick performance metrics
    const history = (firm.stock.history || [firm.stock.price]).slice(-this.stockChartTimeframe);
    const startPrice = history[0] || firm.stock.price;
    const endPrice = history[history.length - 1] || firm.stock.price;
    const priceDiff = endPrice - startPrice;
    const percentDiff = startPrice > 0 ? ((priceDiff / startPrice) * 100).toFixed(1) : 0;

    const changeEl = document.getElementById('drawer-price-change');
    if (changeEl) {
      const isPos = priceDiff >= 0;
      changeEl.className = isPos ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';
      changeEl.innerText = `${isPos ? '+' : ''}${percentDiff}% (${isPos ? '+' : ''}$${priceDiff.toFixed(2)}) ${isPos ? '📈' : '📉'}`;
    }

    // Fundamentals
    const minPrice = Math.min(...history);
    const maxPrice = Math.max(...history);

    const lowEl = document.getElementById('drawer-stat-low');
    if (lowEl) lowEl.innerText = `$${minPrice.toFixed(2)}`;

    const highEl = document.getElementById('drawer-stat-high');
    if (highEl) highEl.innerText = `$${maxPrice.toFixed(2)}`;

    const propEl = document.getElementById('drawer-stat-properties');
    if (propEl) propEl.innerText = `${firm.totalLand || 0} Land / ${firm.totalBuildings || 0} Bldgs`;

    const owned = (myFirm && myFirm.shareHoldings && myFirm.shareHoldings[firm.id]) || 0;
    const totalShares = firm.stock.totalShares || 100000;
    const votingPercent = ((owned / totalShares) * 100).toFixed(1);

    const ownedEl = document.getElementById('drawer-stat-owned');
    if (ownedEl) ownedEl.innerText = `${owned.toLocaleString()} shares (${votingPercent}%)`;

    // Cash & Trade firm name
    const playerCashEl = document.getElementById('drawer-player-cash');
    if (playerCashEl && myFirm) playerCashEl.innerText = `$${Math.round(myFirm.cash).toLocaleString()}`;

    const tradeFirmNameEl = document.getElementById('drawer-trade-firm-name');
    if (tradeFirmNameEl) tradeFirmNameEl.innerText = firm.name;

    // Takeover Banner
    const takeoverBanner = document.getElementById('drawer-takeover-banner');
    if (takeoverBanner) {
      if (votingPercent > 50 && firm.id !== myFirm.id) {
        takeoverBanner.classList.remove('hidden');
      } else {
        takeoverBanner.classList.add('hidden');
      }
    }

    // Draw Canvas Graph
    this.drawStockChartCanvas(history, firm.color || '#38bdf8', endPrice, firm.stock.nav);
  }

  drawStockChartCanvas(history, firmColor, currentPrice, navPrice) {
    const canvas = document.getElementById('stock-chart-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    if (!history || history.length === 0) return;

    const padLeft = 50;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 30;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const minRaw = Math.min(...history, navPrice || currentPrice);
    const maxRaw = Math.max(...history, navPrice || currentPrice);
    const range = Math.max(2.0, maxRaw - minRaw);
    const minVal = Math.max(0.5, minRaw - range * 0.1);
    const maxVal = maxRaw + range * 0.1;
    const valRange = maxVal - minVal;

    // Draw Gridlines & Y-Axis Labels
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padTop + (plotHeight / gridSteps) * i;
      const priceVal = maxVal - (valRange / gridSteps) * i;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`$${priceVal.toFixed(2)}`, padLeft - 6, y);
    }
    ctx.setLineDash([]);

    // NAV Reference Line (Dashed Amber)
    if (navPrice) {
      const navY = padTop + plotHeight * (1 - (navPrice - minVal) / valRange);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, navY);
      ctx.lineTo(width - padRight, navY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`NAV $${navPrice.toFixed(2)}`, width - padRight - 4, navY - 6);
    }

    const n = history.length;
    const getX = (idx) => padLeft + (idx / (n - 1)) * plotWidth;
    const getY = (val) => padTop + plotHeight * (1 - (val - minVal) / valRange);

    const isGainer = history[history.length - 1] >= history[0];
    const lineColor = isGainer ? '#38bdf8' : '#f43f5e';
    const fillTopColor = isGainer ? 'rgba(56, 189, 248, 0.35)' : 'rgba(244, 63, 94, 0.35)';

    // Gradient Area Fill under price curve
    const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    gradient.addColorStop(0, fillTopColor);
    gradient.addColorStop(1, 'rgba(6, 9, 17, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), height - padBottom);
    for (let i = 0; i < n; i++) {
      ctx.lineTo(getX(i), getY(history[i]));
    }
    ctx.lineTo(getX(n - 1), height - padBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Price Line Stroke
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(history[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(getX(i), getY(history[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Timeline labels at bottom
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`-${n} Ticks Ago`, padLeft, height - padBottom + 16);
    ctx.textAlign = 'right';
    ctx.fillText('Current Tick', width - padRight, height - padBottom + 16);

    // Interactive Hover Crosshair & Tooltip
    if (this.stockChartHoverIdx >= 0 && this.stockChartHoverIdx < n) {
      const hIdx = this.stockChartHoverIdx;
      const hX = getX(hIdx);
      const hY = getY(history[hIdx]);
      const hVal = history[hIdx];

      // Vertical crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, padTop);
      ctx.lineTo(hX, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hX, hY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip Box
      const tipText = `$${hVal.toFixed(2)}`;
      ctx.font = 'bold 11px -apple-system, monospace';
      const tipWidth = ctx.measureText(tipText).width + 12;
      const tipHeight = 18;
      let tipX = hX - tipWidth / 2;
      if (tipX < padLeft) tipX = padLeft;
      if (tipX + tipWidth > width - padRight) tipX = width - padRight - tipWidth;
      const tipY = Math.max(padTop - 20, hY - 26);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(tipX, tipY, tipWidth, tipHeight, 4);
      ctx.fill();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tipText, tipX + tipWidth / 2, tipY + tipHeight / 2);
    }
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

      firm.cash -= actualRepay;
      firm.marginLoan.borrowedAmount -= actualRepay;
      this.updateHUD(this.network.gameState, this.network.firmId);
      this.renderMarginTab(this.network.gameState, firm);

      this.showToast(`💳 Paid back $${actualRepay.toLocaleString()} of bank loan! Remaining Debt: $${firm.marginLoan.borrowedAmount.toLocaleString()}`, 'success');
      SpeechHelper.speakIfAuto(`Paid back ${actualRepay.toLocaleString()} dollars of debt.`);
    }
    this.network.repayMarginLoan(amount);
  }

  lobbyCouncilVeto(districtId) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (firm && firm.influencePoints < 50) {
      this.showToast('Need 50 Respect Points (⭐) to lobby a neighborhood leader!', 'error');
      SpeechHelper.speakIfAuto('You need 50 Respect Points to change the neighborhood leader mind.');
      return;
    }
    this.network.lobbyCouncilVeto(districtId);
  }

  overrideVeto(districtId) {
    this.lobbyCouncilVeto(districtId);
  }

  proposeBill(policyId) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (this.network.gameState.municipal.activeBill) {
      this.showToast('A bill is already being voted on!', 'error');
      return;
    }
    this.network.proposeBill(policyId);
    this.showToast('📜 Bill submitted to City Hall! Legislative floor debate initiated.', 'success');
    SpeechHelper.speakIfAuto('You introduced a new policy bill to the City Council.');
  }

  lobbyBill(rpAmount) {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    const rp = parseInt(rpAmount, 10);
    if (isNaN(rp) || rp <= 0) {
      this.showToast('Enter a valid integer of Respect Points!', 'error');
      return;
    }
    if (!firm || firm.influencePoints < rp) {
      this.showToast(`Not enough Respect Points! You only have ${firm ? firm.influencePoints : 0} ⭐.`, 'error');
      SpeechHelper.speakIfAuto('You do not have enough Respect Points.');
      return;
    }
    this.network.lobbyBill(rp);
    this.showToast(`🏛️ Lobbied bill with ${rp} Respect Points! Swaying council votes...`, 'success');
    SpeechHelper.speakIfAuto(`Lobbied the bill with ${rp} Respect Points.`);
  }

  bribeOfficial() {
    const firm = this.network.gameState.firms.get(this.network.firmId);
    if (!firm || firm.cash < 25000) {
      this.showToast('Need $25,000 in cash to offer a political bribe!', 'error');
      SpeechHelper.speakIfAuto('You do not have enough cash to offer a bribe.');
      return;
    }
    this.network.bribeOfficial();
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
