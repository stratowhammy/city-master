// public/js/engine/NetworkClient.js
// Resilient WebSocket Client with Reconnection Tokens and Delta Synchronization

class NetworkClient {
  constructor() {
    this.ws = null;
    this.firmId = 'firm_player_1';
    this.token = localStorage.getItem('city_master_reconnect_token') || null;
    this.gameState = {
      gridSize: 60,
      tick: 0,
      grid: [],
      firms: new Map(),
      districts: [],
      municipal: {
        mayor: { name: 'Mayor Sterling' },
        treasury: 2500000,
        councilSeats: [],
        pendingVariances: [],
        foreignRelations: { nation: 'Federation of Valoria', embargoActive: false, tariffRate: 0.1 }
      },
      resources: {
        concrete: { name: 'Concrete', spotPrice: 45, supply: 10000 },
        steel: { name: 'Structural Steel', spotPrice: 120, supply: 6000 },
        timber: { name: 'Engineered Timber', spotPrice: 35, supply: 12000 },
        rareEarth: { name: 'Rare-Earth Elements', spotPrice: 450, supply: 2000, foreignControlled: true },
        superconductors: { name: 'High-Temp Superconductors', spotPrice: 850, supply: 1200, foreignControlled: true }
      },
      news: []
    };

    // Pre-populate 60x60 starter grid so map renders instantly
    this.initStarterGrid();

    this.callbacks = {
      onInit: null,
      onDelta: null,
      onActionSuccess: null,
      onActionError: null,
      onChat: null
    };

    this.connect();
  }

  initStarterGrid() {
    const size = this.gameState.gridSize;
    this.gameState.grid = new Array(size);
    for (let x = 0; x < size; x++) {
      this.gameState.grid[x] = new Array(size);
      for (let y = 0; y < size; y++) {
        const isRiver = (x > 26 && x < 32 && y > 10 && y < 55) || (y > 27 && y < 31 && x < 28);
        const isPark = !isRiver && (x % 11 === 0 && y % 11 === 0);
        this.gameState.grid[x][y] = {
          x,
          y,
          districtId: 1,
          isWater: isRiver,
          ownerId: null,
          zoning: isRiver ? 'WATER' : (isPark ? 'CIVIC' : 'NONE'),
          basePrice: 2000,
          landValue: 2000,
          pollution: 0,
          crime: 0,
          desirability: 50,
          groundBuilding: isPark ? { type: 'PARK', level: 1, name: 'Municipal Green Oasis', unionBuilt: true, health: 100, rentIncome: 0 } : null,
          floatingBuilding: null
        };
      }
    }
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.ws = new WebSocket(`${protocol}//${host}`);

    this.ws.onopen = () => {
      console.log('Connected to City Master server! Authenticating...');
      this.send('INIT_AUTH', { reconnectionToken: this.token });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('Disconnected from server. Retrying in 2 seconds...');
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
    };
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  handleMessage(msg) {
    const { type, data } = msg;

    if (type === 'INIT_STATE') {
      this.token = data.reconnectionToken;
      localStorage.setItem('city_master_reconnect_token', this.token);
      this.firmId = data.firmId;

      this.gameState.gridSize = data.gridSize;
      this.gameState.tick = data.tick;
      this.gameState.grid = data.grid;
      this.gameState.districts = data.districts;
      this.gameState.municipal = data.municipal;
      this.gameState.resources = data.resources;
      this.gameState.news = data.news || [];

      this.gameState.firms = new Map();
      for (const firm of data.firms) {
        this.gameState.firms.set(firm.id, firm);
      }

      console.log(`Initialized local GameState. Assigned Firm ID: ${this.firmId}`);
      if (this.callbacks.onInit) this.callbacks.onInit(this.gameState, this.firmId);
    } else if (type === 'DELTA_PATCH') {
      this.gameState.tick = data.tick;

      // Apply mutated tiles
      if (data.tiles) {
        for (const t of data.tiles) {
          if (this.gameState.grid[t.x]) {
            this.gameState.grid[t.x][t.y] = t;
          }
        }
      }

      // Apply mutated firms
      if (data.firms) {
        for (const f of data.firms) {
          this.gameState.firms.set(f.id, f);
        }
      }

      // Apply updated resources & municipal state
      if (data.resources) this.gameState.resources = data.resources;
      if (data.municipal) this.gameState.municipal = data.municipal;
      if (data.news) this.gameState.news = data.news;

      if (this.callbacks.onDelta) this.callbacks.onDelta(this.gameState);
    } else if (type === 'PROFILE_CREATED') {
      this.firmId = data.firmId;
      if (data.firm) this.gameState.firms.set(data.firmId, data.firm);
      if (this.callbacks.onProfileCreated) this.callbacks.onProfileCreated(data);
    } else if (type === 'ACTION_SUCCESS') {
      if (this.callbacks.onActionSuccess) this.callbacks.onActionSuccess(data);
    } else if (type === 'ACTION_ERROR') {
      if (this.callbacks.onActionError) this.callbacks.onActionError(data);
    } else if (type === 'CHAT_BROADCAST') {
      if (this.callbacks.onChat) this.callbacks.onChat(data);
    }
  }

  // High-level Actions
  createProfile(profileName, color) { this.send('CREATE_PROFILE', { profileName, color }); }
  buyLand(x, y) { this.send('BUY_LAND', { x, y }); }
  setZoning(x, y, zoning) { this.send('SET_ZONING', { x, y, zoning }); }
  constructBuilding(x, y, buildingType, unionBuilt) { this.send('CONSTRUCT_BUILDING', { x, y, buildingType, unionBuilt }); }
  upgradeBuilding(x, y) { this.send('UPGRADE_BUILDING', { x, y }); }
  constructArcology(x, y, unionBuilt) { this.send('CONSTRUCT_ARCOLOGY', { x, y, unionBuilt }); }
  demolish(x, y) { this.send('DEMOLISH', { x, y }); }
  submitZBAVariance(x, y, requestedZoning, proposedLevel) { this.send('ZBA_VARIANCE_REQUEST', { x, y, requestedZoning, proposedLevel }); }
  overrideVeto(districtId) { this.send('LOBBY_VETO', { districtId }); }
  lobbyCouncilVeto(districtId) { this.send('LOBBY_VETO', { districtId }); }
  proposeBill(policyId) { this.send('PROPOSE_BILL', { policyId }); }
  lobbyBill(rpAmount) { this.send('LOBBY_BILL', { rpAmount }); }
  bribeOfficial() { this.send('BRIBE_OFFICIAL'); }
  grantTaxAbatement(x, y, isUnionPledged) { this.send('GRANT_TAX_ABATEMENT', { x, y, isUnionPledged }); }
  setTaxRates(propertyTaxRate, wageTaxRate) { this.send('SET_TAX_RATES', { propertyTaxRate, wageTaxRate }); }
  triggerAudit(targetFirmId) { this.send('TRIGGER_AUDIT', { targetFirmId }); }
  buyResource(resourceKey, amount) { this.send('BUY_RESOURCE', { resourceKey, amount }); }
  mayorDiplomacy() { this.send('MAYOR_DIPLOMACY'); }
  mayorMilitary() { this.send('MAYOR_MILITARY'); }
  tradeStock(targetFirmId, count, isBuy) { this.send('TRADE_STOCK', { targetFirmId, count, isBuy }); }
  hostileTakeover(targetFirmId) { this.send('HOSTILE_TAKEOVER', { targetFirmId }); }
  takeMarginLoan(amount) { this.send('TAKE_MARGIN_LOAN', { amount }); }
  repayMarginLoan(amount) { this.send('REPAY_MARGIN_LOAN', { amount }); }
  setGameSpeed(speed) { this.send('SET_GAME_SPEED', { speed }); }
  resetScenario(scenarioId) { this.send('RESET_SCENARIO', { scenarioId }); }
  sendChatMessage(message) { this.send('CHAT_MESSAGE', { message }); }
}

window.NetworkClient = NetworkClient;
