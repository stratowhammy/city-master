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
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTool = btn.dataset.tool;
        const speechDesc = btn.dataset.speech || btn.title || this.selectedTool;
        this.showToast(`Selected: ${btn.title || this.selectedTool}`);
      });
    });

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
      });
    });

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
    this.network.callbacks.onInit = (state, firmId) => {
      this.updateHUD(state, firmId);
      this.renderSidebar(state, firmId);
    };

    this.network.callbacks.onDelta = (state) => {
      this.updateHUD(state, this.network.firmId);
      this.renderSidebar(state, this.network.firmId);
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
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        this.renderer.camera.x += dx * (window.devicePixelRatio || 1);
        this.renderer.camera.y += dy * (window.devicePixelRatio || 1);
      }

      const rect = canvas.getBoundingClientRect();
      const clientX = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
      const clientY = (e.clientY - rect.top) * (window.devicePixelRatio || 1);

      const invZoom = 1 / this.renderer.camera.zoom;
      const worldX = (clientX - canvas.width / 2 - this.renderer.camera.x) * invZoom;
      const worldY = (clientY - canvas.height / 2 - this.renderer.camera.y) * invZoom;

      const gridPos = this.renderer.screenToGrid(worldX, worldY);
      const gs = this.network.gameState;

      if (gridPos.x >= 0 && gridPos.x < (gs.gridSize || 60) && gridPos.y >= 0 && gridPos.y < (gs.gridSize || 60)) {
        this.renderer.hoveredTile = gridPos;
        if (gs.grid && gs.grid[gridPos.x]) {
          this.updateTileInspector(gs.grid[gridPos.x][gridPos.y]);
        }
      } else {
        this.renderer.hoveredTile = null;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        const moved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
        if (moved < 6 && this.renderer.hoveredTile) {
          this.executeToolAction(this.renderer.hoveredTile.x, this.renderer.hoveredTile.y);
        }
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.renderer.camera.zoom = Math.max(this.renderer.camera.minZoom, Math.min(this.renderer.camera.maxZoom, this.renderer.camera.zoom * zoomFactor));
    }, { passive: false });
  }

  executeToolAction(x, y) {
    const gs = this.network.gameState;
    const tile = gs.grid && gs.grid[x] && gs.grid[x][y];
    if (!tile) return;

    this.renderer.selectedTile = { x, y };

    switch (this.selectedTool) {
      case 'INSPECT':
        this.updateTileInspector(tile, true);
        break;

      case 'BUY_LAND':
        if (tile.isWater) {
          this.showToast('You cannot buy water tiles! Fish live here.', 'error');
        } else if (tile.ownerId) {
          this.showToast('Someone else already owns this tile!', 'error');
        } else {
          this.network.buyLand(x, y);
        }
        break;

      case 'BUILD_RESIDENTIAL':
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
        } else {
          this.network.constructBuilding(x, y, 'RESIDENTIAL', this.unionPledge);
        }
        break;

      case 'BUILD_COMMERCIAL':
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
        } else {
          this.network.constructBuilding(x, y, 'COMMERCIAL', this.unionPledge);
        }
        break;

      case 'BUILD_INDUSTRIAL':
        if (!tile.ownerId) {
          this.showToast('Buy this land first with the "Buy Land" button!', 'error');
        } else {
          this.network.constructBuilding(x, y, 'INDUSTRIAL', this.unionPledge);
        }
        break;

      case 'BUILD_ARCOLOGY':
        if (!tile.ownerId) {
          this.showToast('You must own the ground below before launching a Floating Sky City!', 'error');
        } else {
          this.network.constructArcology(x, y, this.unionPledge);
        }
        break;

      case 'UPGRADE':
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only upgrade your own buildings!', 'error');
        } else if (!tile.groundBuilding) {
          this.showToast('Nothing to upgrade on this tile!', 'error');
        } else {
          this.network.upgradeBuilding(x, y);
        }
        break;

      case 'DEMOLISH':
        if (tile.ownerId !== this.network.firmId) {
          this.showToast('You can only bulldoze your own buildings!', 'error');
        } else {
          this.network.demolish(x, y);
        }
        break;

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
    const ratio = myFirm.calculatedMarginRatio || 999;
    const maxLeverage = Math.round(equity * 0.70);

    const speechMargin = `Bank Piggy Bank and Safe Money Meter! Total company wealth is ${equity.toLocaleString()} dollars. You borrowed ${loan.toLocaleString()} dollars from the bank. Your safe money meter is ${ratio > 500 ? 'over 100 percent and very safe' : ratio + ' percent'}. Keep the meter in the green to protect your company from debt!`;

    let html = `
      <div class="space-y-4 text-xs">
        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-xs text-slate-300 font-bold uppercase">🏦 Bank Loans & Safe Money Meter</span>
            <button class="tts-btn" onclick="SpeechHelper.speak('${speechMargin.replace(/'/g, "\\'")}')" title="Read Aloud">🔊 Read</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="p-2 rounded bg-slate-900">
              <span class="text-slate-400 block text-[10px]">💎 Total Wealth:</span>
              <span class="text-base font-bold text-emerald-400">$${equity.toLocaleString()}</span>
            </div>
            <div class="p-2 rounded bg-slate-900">
              <span class="text-slate-400 block text-[10px]">💳 Bank Debt (Borrowed):</span>
              <span class="text-base font-bold text-rose-400">$${loan.toLocaleString()}</span>
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between text-[11px]">
              <span class="text-slate-300 font-semibold">Safe Money Meter:</span>
              <span class="font-bold ${ratio >= 130 ? 'text-emerald-400' : (ratio >= 110 ? 'text-amber-400' : 'text-rose-500')}">${ratio > 500 ? '100% (PERFECT)' : ratio + '%'}</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div class="h-2 rounded-full ${ratio >= 130 ? 'bg-emerald-500' : (ratio >= 110 ? 'bg-amber-500' : 'bg-rose-600')}" style="width: ${Math.min(100, Math.max(5, ratio / 2))}%"></div>
            </div>
            <div class="flex justify-between text-[9px] text-slate-400 font-semibold">
              <span class="text-rose-400">🔴 Debt Danger</span>
              <span class="text-amber-400">🟡 Watch Out</span>
              <span class="text-emerald-400">🟢 Super Safe</span>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-slate-800/90 border border-slate-700 space-y-2">
          <div class="font-bold text-slate-200">Borrow or Pay Back Loan</div>
          <div class="text-[11px] text-slate-300">You can borrow up to: <span class="text-sky-400 font-bold">$${Math.max(0, maxLeverage - loan).toLocaleString()}</span></div>
          <div class="flex gap-2 pt-1">
            <button onclick="window.ui.borrow(25000)" class="flex-1 py-1.5 font-bold rounded bg-sky-600 hover:bg-sky-500 text-white">Borrow $25,000</button>
            <button onclick="window.ui.repay(25000)" class="flex-1 py-1.5 font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white" ${loan <= 0 ? 'disabled' : ''}>Pay Back $25,000</button>
          </div>
        </div>

        <div class="p-3 rounded-lg bg-indigo-950/50 border border-indigo-800/50 space-y-1 text-slate-300 text-[11px]">
          <div class="font-bold text-indigo-300">📖 Safe Money Rules:</div>
          <p>• <strong>🟢 Green (130%+):</strong> You are super safe!</p>
          <p>• <strong>🟡 Yellow (110%-130%):</strong> Your buffer is getting thin. Pay back some loan!</p>
          <p>• <strong>🔴 Red (Under 110%):</strong> Debt warning! Building is frozen until you pay back money.</p>
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
    // Read aloud automatically for young students
    SpeechHelper.speak(guidance.speechText || guidance.explanation);
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
    SpeechHelper.speak(advice.speechText || advice.explanation);
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

  tradeStock(targetFirmId, count, isBuy) { this.network.tradeStock(targetFirmId, count, isBuy); }
  takeover(targetFirmId) { this.network.hostileTakeover(targetFirmId); }
  borrow(amount) { this.network.takeMarginLoan(amount); }
  repay(amount) { this.network.repayMarginLoan(amount); }
  overrideVeto(districtId) { this.network.overrideVeto(districtId); }
  buyRes(key, amt) { this.network.buyResource(key, amt); }
  diplomacy() { this.network.mayorDiplomacy(); }
  military() { this.network.mayorMilitary(); }
}

window.UIController = UIController;
