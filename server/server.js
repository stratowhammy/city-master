// server/server.js
// High-performance Authoritative Server for City Master MMO Isometric Simulation
// Features: Zero external dependencies, RFC 6455 WebSocket Engine, 20Hz Delta Compression, Reconnection Grace Period.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const GameState = require('./engine/GameState');
const AntigravityEngine = require('./engine/AntigravityEngine');
const CellularAutomata = require('./engine/CellularAutomata');
const PoliticsEngine = require('./engine/PoliticsEngine');
const MacroeconomicsEngine = require('./engine/MacroeconomicsEngine');
const StockMarketEngine = require('./engine/StockMarketEngine');
const BotAI = require('./engine/BotAI');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Initialize Game Engine & Subsystems
let gameState = new GameState();
let antigravityEngine = new AntigravityEngine(gameState);
let cellularAutomata = new CellularAutomata(gameState);
let politicsEngine = new PoliticsEngine(gameState);
let macroEngine = new MacroeconomicsEngine(gameState);
let stockEngine = new StockMarketEngine(gameState);
let botAI = new BotAI(gameState, politicsEngine, stockEngine, macroEngine, antigravityEngine);

let gameSpeed = 1.0;
const clients = new Map(); // socket -> { id, firmId, token, isAlive }

// MIME types dictionary for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// HTTP Static Server
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // REST API status check
  if (urlPath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      tick: gameState.tick,
      connectedClients: clients.size,
      firmsCount: gameState.firms.size,
      treasury: gameState.municipal.treasury,
      mayor: gameState.municipal.mayor.name
    }));
    return;
  }

  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

// RFC 6455 WebSocket Implementation
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const digest = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${digest}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  const client = {
    id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    socket,
    firmId: null,
    token: null,
    isAlive: true
  };
  clients.set(socket, client);

  // Framing buffer
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const byte1 = buffer[0];
      const byte2 = buffer[1];
      const opcode = byte1 & 0x0f;
      const isMasked = (byte2 & 0x80) !== 0;
      let payloadLength = byte2 & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (buffer.length < 4) break;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLength === 127) {
        if (buffer.length < 10) break;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskKeyLength = isMasked ? 4 : 0;
      if (buffer.length < offset + maskKeyLength + payloadLength) break;

      let payload = buffer.subarray(offset + maskKeyLength, offset + maskKeyLength + payloadLength);
      if (isMasked) {
        const maskKey = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(payloadLength);
        for (let i = 0; i < payloadLength; i++) {
          unmasked[i] = payload[i] ^ maskKey[i % 4];
        }
        payload = unmasked;
      }

      buffer = buffer.subarray(offset + maskKeyLength + payloadLength);

      // Handle Opcode
      if (opcode === 0x8) {
        // Connection Close
        handleDisconnect(client);
        socket.destroy();
        return;
      } else if (opcode === 0x9) {
        // Ping -> Pong
        sendRawFrame(socket, 0xa, Buffer.alloc(0));
      } else if (opcode === 0x1) {
        // Text Frame
        try {
          const msg = JSON.parse(payload.toString('utf-8'));
          handleClientMessage(client, msg);
        } catch (e) {
          console.error('Error parsing client message:', e);
        }
      }
    }
  });

  socket.on('close', () => handleDisconnect(client));
  socket.on('error', () => handleDisconnect(client));
});

function sendRawFrame(socket, opcode, payloadBuffer) {
  if (socket.destroyed || !socket.writable) return;
  const len = payloadBuffer.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  socket.write(Buffer.concat([header, payloadBuffer]));
}

function sendToClient(client, type, data) {
  const json = JSON.stringify({ type, data, timestamp: Date.now() });
  sendRawFrame(client.socket, 0x1, Buffer.from(json, 'utf-8'));
}

function broadcast(type, data) {
  const json = JSON.stringify({ type, data, timestamp: Date.now() });
  const buf = Buffer.from(json, 'utf-8');
  for (const client of clients.values()) {
    sendRawFrame(client.socket, 0x1, buf);
  }
}

// Client message router
function handleClientMessage(client, msg) {
  const { type, payload } = msg;

  if (type === 'INIT_AUTH') {
    // Check reconnectionToken
    const token = payload && payload.reconnectionToken;
    let firmId = 'firm_player_1';

    if (token && gameState.reconnectionTokens.has(token)) {
      const saved = gameState.reconnectionTokens.get(token);
      firmId = saved.firmId;
      client.token = token;
      client.firmId = firmId;
      console.log(`Reconnected player firm: ${firmId} with token: ${token}`);
    } else {
      // New token
      const newToken = `tok_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      // Find open human slot or assign firm_player_1
      firmId = 'firm_player_1';
      gameState.reconnectionTokens.set(newToken, { firmId, connectedAt: Date.now() });
      client.token = newToken;
      client.firmId = firmId;
    }

    const firm = gameState.firms.get(firmId);
    if (firm) firm.isHuman = true;

    // Send Full Initial State Snapshot
    sendToClient(client, 'INIT_STATE', {
      reconnectionToken: client.token,
      firmId: client.firmId,
      gridSize: gameState.gridSize,
      districts: gameState.districts,
      municipal: gameState.municipal,
      resources: gameState.resources,
      firms: Array.from(gameState.firms.values()),
      grid: gameState.grid,
      news: gameState.newsFeed,
      tick: gameState.tick
    });
    return;
  }

  if (type === 'CREATE_PROFILE') {
    const { profileName, color } = payload || {};
    const newFirm = gameState.registerUserFirm(profileName, color);
    client.firmId = newFirm.id;
    if (client.token) {
      gameState.reconnectionTokens.set(client.token, { firmId: newFirm.id, connectedAt: Date.now() });
    }
    sendToClient(client, 'PROFILE_CREATED', {
      firmId: newFirm.id,
      firm: newFirm
    });
    sendToClient(client, 'ACTION_SUCCESS', {
      message: `Profile "${newFirm.name}" created and added to the City Stock Exchange!`
    });
    return;
  }

  const firm = gameState.firms.get(client.firmId);
  if (!firm) return;

  // Margin Call construction freeze check
  const isConstructionAction = ['BUY_LAND', 'CONSTRUCT_BUILDING', 'UPGRADE_BUILDING', 'CONSTRUCT_ARCOLOGY'].includes(type);
  if (isConstructionAction && (firm.marginStatus === 'MARGIN_CALL' || firm.marginStatus === 'LIQUIDATION')) {
    sendToClient(client, 'ACTION_ERROR', {
      message: 'TRANSACTION FROZEN: Your account is under a strict Margin Call! You must deposit cash or liquidate assets to restore your margin ratio before building.'
    });
    return;
  }

  switch (type) {
    case 'BUY_LAND': {
      const { x, y } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (tile && !tile.ownerId && !tile.isWater && firm.cash >= tile.landValue) {
        firm.cash -= tile.landValue;
        tile.ownerId = firm.id;
        firm.totalLand = (firm.totalLand || 0) + 1;
        gameState.checkAndActivateTrading(firm.id);
        gameState.updateRoadNetwork();
        gameState.markTileDirty(x, y);
        gameState.markFirmDirty(firm.id);
        sendToClient(client, 'ACTION_SUCCESS', { message: `Acquired land at (${x}, ${y}) for $${tile.landValue.toLocaleString()}` });
      }
      break;
    }

    case 'SET_ZONING': {
      const { x, y, zoning } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (tile && tile.ownerId === firm.id) {
        tile.zoning = zoning;
        gameState.markTileDirty(x, y);
      }
      break;
    }

    case 'CONSTRUCT_BUILDING': {
      const { x, y, buildingType, unionBuilt } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (!tile || tile.ownerId !== firm.id || (tile.groundBuilding && tile.groundBuilding.type !== 'ROAD')) return;

      // Check councilmanic prerogative / zoning rules
      const check = politicsEngine.checkCouncilmanicPrerogative(tile.districtId, firm.id, buildingType, 1, false);
      if (!check.allowed) {
        sendToClient(client, 'ACTION_ERROR', { message: check.reason, vetoed: true, districtId: tile.districtId });
        return;
      }

      const cost = unionBuilt ? 22000 : 15000;
      if (firm.cash < cost) {
        sendToClient(client, 'ACTION_ERROR', { message: `Insufficient cash ($${cost.toLocaleString()} required)` });
        return;
      }

      firm.cash -= cost;
      firm.totalBuildings = (firm.totalBuildings || 0) + 1;
      tile.groundBuilding = {
        type: buildingType,
        level: 1,
        name: `${firm.name.split(' ')[0]} ${buildingType.toLowerCase()} L1`,
        constructedTick: gameState.tick,
        health: 100,
        taxAbatedUntil: 0,
        unionBuilt: !!unionBuilt,
        rentIncome: 80,
        pollution: buildingType === 'INDUSTRIAL' ? 30 : 0,
        crime: buildingType === 'COMMERCIAL' ? 12 : 0,
        population: buildingType === 'RESIDENTIAL' ? 120 : 0,
        workers: buildingType === 'COMMERCIAL' ? 60 : 35
      };

      if (unionBuilt) {
        politicsEngine.grantTaxAbatement(firm.id, x, y, true);
      }

      gameState.checkAndActivateTrading(firm.id);
      gameState.updateRoadNetwork();
      gameState.markTileDirty(x, y);
      gameState.markFirmDirty(firm.id);
      sendToClient(client, 'ACTION_SUCCESS', { message: `Constructed Level 1 ${buildingType}` });
      break;
    }

    case 'UPGRADE_BUILDING': {
      const { x, y } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (!tile || tile.ownerId !== firm.id || !tile.groundBuilding || tile.groundBuilding.level >= 3) return;

      const newLevel = tile.groundBuilding.level + 1;
      const check = politicsEngine.checkCouncilmanicPrerogative(tile.districtId, firm.id, tile.groundBuilding.type, newLevel, false);
      if (!check.allowed) {
        sendToClient(client, 'ACTION_ERROR', { message: check.reason, vetoed: true, districtId: tile.districtId });
        return;
      }

      const cost = newLevel * 25000;
      if (firm.cash < cost) {
        sendToClient(client, 'ACTION_ERROR', { message: `Insufficient cash ($${cost.toLocaleString()} required)` });
        return;
      }

      firm.cash -= cost;
      tile.groundBuilding.level = newLevel;
      tile.groundBuilding.name = `${firm.name.split(' ')[0]} ${tile.groundBuilding.type.toLowerCase()} L${newLevel}`;
      
      gameState.updateRoadNetwork();
      gameState.markTileDirty(x, y);
      gameState.markFirmDirty(firm.id);
      sendToClient(client, 'ACTION_SUCCESS', { message: `Upgraded structure to Level ${newLevel}` });
      break;
    }

    case 'CONSTRUCT_ARCOLOGY': {
      // Sky City feature disabled (preserved for future reactivation)
      sendToClient(client, 'ACTION_ERROR', { message: 'Sky Cities are currently disabled.' });
      break;

      /*
      const { x, y, unionBuilt } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (!tile || tile.ownerId !== firm.id || tile.floatingBuilding) return;

      // Check Councilmanic Prerogative for Level 4 Arcologies
      const check = politicsEngine.checkCouncilmanicPrerogative(tile.districtId, firm.id, 'ARCOLOGY', 4, false);
      if (!check.allowed) {
        sendToClient(client, 'ACTION_ERROR', { message: check.reason, vetoed: true, districtId: tile.districtId });
        return;
      }

      const cost = unionBuilt ? 140000 : 95000;
      const reqRareEarth = 15;
      const reqSuper = 8;

      if (firm.cash < cost) {
        sendToClient(client, 'ACTION_ERROR', { message: `Insufficient cash ($${cost.toLocaleString()} required)` });
        return;
      }
      if (firm.inventory.rareEarth < reqRareEarth || firm.inventory.superconductors < reqSuper) {
        sendToClient(client, 'ACTION_ERROR', {
          message: `Missing advanced materials: Need ${reqRareEarth} Rare-Earths & ${reqSuper} Superconductors!`
        });
        return;
      }

      firm.cash -= cost;
      firm.inventory.rareEarth -= reqRareEarth;
      firm.inventory.superconductors -= reqSuper;
      firm.totalArcologies = (firm.totalArcologies || 0) + 1;

      tile.floatingBuilding = {
        type: 'ARCOLOGY',
        level: 4,
        name: `${firm.name.split(' ')[0]} Quantum Arcology`,
        constructedTick: gameState.tick,
        z_offset: 64,
        target_z: 64,
        current_z: 64,
        health: 100,
        stability: 100,
        rareEarthRate: 1,
        superconductorRate: 1,
        maintenanceCash: 250,
        rentIncome: 420,
        taxAbatedUntil: 0,
        unionBuilt: !!unionBuilt,
        population: 650,
        residentsUsingFlyingTransit: true
      };

      if (unionBuilt) {
        politicsEngine.grantTaxAbatement(firm.id, x, y, true);
      }

      gameState.addNews(
        `ANTIGRAVITY LAUNCH: ${firm.name} successfully lofted Level 4 Floating Arcology into the skyline of District ${tile.districtId}!`,
        'success',
        { x, y }
      );

      gameState.markTileDirty(x, y);
      gameState.markFirmDirty(firm.id);
      sendToClient(client, 'ACTION_SUCCESS', { message: 'Level 4 Antigravity Arcology deployed and hovering at Z=64!' });
      break;
      */
    }

    case 'DEMOLISH': {
      const { x, y } = payload;
      const tile = gameState.grid[x] && gameState.grid[x][y];
      if (!tile || tile.ownerId !== firm.id) return;

      if (tile.floatingBuilding) {
        tile.floatingBuilding = null;
        firm.totalArcologies = Math.max(0, firm.totalArcologies - 1);
      } else if (tile.groundBuilding) {
        tile.groundBuilding = null;
      }
      gameState.updateRoadNetwork();
      gameState.markTileDirty(x, y);
      gameState.markFirmDirty(firm.id);
      sendToClient(client, 'ACTION_SUCCESS', { message: 'Demolished structure' });
      break;
    }

    case 'ZBA_VARIANCE_REQUEST': {
      const { x, y, requestedZoning, proposedLevel } = payload;
      const app = politicsEngine.submitZBAVariance(firm.id, x, y, requestedZoning, proposedLevel);
      sendToClient(client, 'ACTION_SUCCESS', { message: `ZBA Variance application submitted for District ${app.districtId}` });
      break;
    }

    case 'PROPOSE_BILL': {
      const { policyId } = payload;
      const res = politicsEngine.proposeBill(firm.id, policyId);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Bill "${res.bill.name}" introduced! Vote in 60 ticks.` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'LOBBY_BILL': {
      const { rpAmount } = payload;
      const res = politicsEngine.lobbyBill(firm.id, rpAmount);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Lobbied bill! Projected support is now ${res.projectedVote}%.` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'BRIBE_OFFICIAL': {
      const res = politicsEngine.bribeOfficial(firm.id);
      if (res.success) {
        if (res.caught) {
          sendToClient(client, 'ACTION_ERROR', { message: res.message });
        } else {
          sendToClient(client, 'ACTION_SUCCESS', { message: res.message });
        }
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'LOBBY_VETO':
    case 'OVERRIDE_VETO': {
      const { districtId } = payload;
      const res = politicsEngine.lobbyCouncilVeto(firm.id, districtId);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Councilmanic veto in District ${districtId} lobbied successfully!` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'GRANT_TAX_ABATEMENT': {
      const { x, y, isUnionPledged } = payload;
      const res = politicsEngine.grantTaxAbatement(firm.id, x, y, isUnionPledged);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: '10-Year Property Tax Abatement approved under Ordinance 961!' });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'SET_TAX_RATES': {
      const { propertyTaxRate, wageTaxRate } = payload;
      const res = politicsEngine.setTaxRates(firm.id, propertyTaxRate, wageTaxRate);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: 'City-wide municipal tax rates updated by Mayoral Decree!' });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'TRIGGER_AUDIT': {
      const { targetFirmId } = payload;
      const res = politicsEngine.triggerAudit(firm.id, targetFirmId);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Municipal ethics audit initiated! Fined rival $${res.auditFine.toLocaleString()}` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'BUY_RESOURCE': {
      const { resourceKey, amount } = payload;
      const res = macroEngine.buyResource(firm.id, resourceKey, amount);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Purchased ${amount} units of ${resourceKey} for $${res.totalCost.toLocaleString()}` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'MAYOR_DIPLOMACY': {
      const res = macroEngine.negotiateDiplomaticTreaty(firm.id);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: 'Valorian Free Trade Accord ratified! Tariffs and embargoes eliminated.' });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'MAYOR_MILITARY': {
      const res = macroEngine.launchMilitaryCampaign(firm.id);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: 'Military deployment launched to enforce maritime supply corridors!' });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'TRADE_STOCK': {
      const { targetFirmId, count, isBuy } = payload;
      const res = stockEngine.tradeShares(firm.id, targetFirmId, count, isBuy);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', {
          message: `${isBuy ? 'Bought' : 'Sold'} ${count.toLocaleString()} shares for $${res.totalCost.toLocaleString()}`
        });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'HOSTILE_TAKEOVER': {
      const { targetFirmId } = payload;
      const res = stockEngine.executeHostileTakeover(firm.id, targetFirmId);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', {
          message: `Hostile Takeover Complete! Absorbed ${res.absorbedCount} land parcels and corporate assets.`
        });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'TAKE_MARGIN_LOAN': {
      const { amount } = payload;
      const res = stockEngine.takeMarginLoan(firm.id, amount);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Originated $${amount.toLocaleString()} margin loan.` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'REPAY_MARGIN_LOAN': {
      const { amount } = payload;
      const res = stockEngine.repayMarginLoan(firm.id, amount);
      if (res.success) {
        sendToClient(client, 'ACTION_SUCCESS', { message: `Repaid $${res.repaid.toLocaleString()} of margin loan.` });
      } else {
        sendToClient(client, 'ACTION_ERROR', { message: res.reason });
      }
      break;
    }

    case 'SET_GAME_SPEED': {
      const { speed } = payload;
      gameSpeed = Math.max(0.1, Math.min(5.0, speed || 1.0));
      break;
    }

    case 'RESET_SCENARIO': {
      const { scenarioId } = payload;
      resetScenario(scenarioId);
      break;
    }

    case 'CHAT_MESSAGE': {
      const text = payload && payload.message;
      if (text) {
        broadcast('CHAT_BROADCAST', {
          senderId: firm.id,
          senderName: firm.name,
          color: firm.color,
          message: text.substring(0, 200),
          time: new Date().toLocaleTimeString()
        });
      }
      break;
    }
  }
}

function handleDisconnect(client) {
  if (!client.socket.destroyed) client.socket.destroy();
  clients.delete(client.socket);
  console.log(`Client disconnected: ${client.id}`);
}

function resetScenario(scenarioId) {
  gameState = new GameState();
  antigravityEngine = new AntigravityEngine(gameState);
  cellularAutomata = new CellularAutomata(gameState);
  politicsEngine = new PoliticsEngine(gameState);
  macroEngine = new MacroeconomicsEngine(gameState);
  stockEngine = new StockMarketEngine(gameState);
  botAI = new BotAI(gameState, politicsEngine, stockEngine, macroEngine, antigravityEngine);

  if (scenarioId === 'ANTIGRAVITY_BOOM') {
    gameState.resources.rareEarth.spotPrice = 120;
    gameState.resources.rareEarth.supply = 20000;
    const player = gameState.firms.get('firm_player_1');
    if (player) {
      player.cash = 500000;
      player.inventory.rareEarth = 200;
      player.inventory.superconductors = 100;
    }
    gameState.addNews('SCENARIO: The Antigravity Gold Rush has begun! Build floating arcologies.', 'success');
  } else if (scenarioId === 'UNION_CRISIS') {
    const player = gameState.firms.get('firm_player_1');
    if (player) player.unionLoyalty = 10;
    gameState.addNews('SCENARIO: City-wide Union Strike Crisis! Reconcile with labor or face shutdowns.', 'warning');
  } else if (scenarioId === 'MARGIN_TEST') {
    const player = gameState.firms.get('firm_player_1');
    if (player) {
      player.cash = 10000;
      player.marginLoan = { borrowedAmount: 180000, collateralShares: 50000 };
    }
    gameState.addNews('SCENARIO: Overleveraged! Manage your margin buffer before the bank seizes your assets.', 'critical');
  }

  // Notify all connected clients with fresh state
  for (const client of clients.values()) {
    const firm = gameState.firms.get(client.firmId || 'firm_player_1');
    if (firm) firm.isHuman = true;
    sendToClient(client, 'INIT_STATE', {
      reconnectionToken: client.token,
      firmId: client.firmId || 'firm_player_1',
      gridSize: gameState.gridSize,
      districts: gameState.districts,
      municipal: gameState.municipal,
      resources: gameState.resources,
      firms: Array.from(gameState.firms.values()),
      grid: gameState.grid,
      news: gameState.newsFeed,
      tick: gameState.tick
    });
  }
}

// 10% Speed Simulation and Broadcast Loop (500ms = 2 Hz)
let lastLoopTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const deltaMs = (now - lastLoopTime) * gameSpeed;
  lastLoopTime = now;

  gameState.tick++;

  // Step Simulation Subsystems
  antigravityEngine.update(now, deltaMs);
  if (gameState.tick % 4 === 0) cellularAutomata.update();
  if (gameState.tick % 6 === 0) politicsEngine.update();
  if (gameState.tick % 5 === 0) macroEngine.update();
  stockEngine.update();
  botAI.update();

  // Low-Bandwidth ChangeTree Delta Broadcast (<20 KB/s)
  if (clients.size > 0) {
    const dirtyTilesList = [];
    for (const key of gameState.dirtyTiles) {
      const [x, y] = key.split(',').map(Number);
      if (gameState.grid[x] && gameState.grid[x][y]) {
        dirtyTilesList.push(gameState.grid[x][y]);
      }
    }
    gameState.dirtyTiles.clear();

    const dirtyFirmsList = [];
    for (const firmId of gameState.dirtyFirms) {
      const firm = gameState.firms.get(firmId);
      if (firm) dirtyFirmsList.push(firm);
    }
    gameState.dirtyFirms.clear();

    const deltaPacket = {
      tick: gameState.tick,
      tiles: dirtyTilesList.length > 0 ? dirtyTilesList : undefined,
      firms: dirtyFirmsList.length > 0 ? dirtyFirmsList : undefined,
      resources: gameState.dirtyMarket ? gameState.resources : undefined,
      municipal: gameState.dirtyPolitics ? gameState.municipal : undefined,
      news: gameState.newsFeed.slice(0, 5)
    };

    gameState.dirtyMarket = false;
    gameState.dirtyPolitics = false;

    broadcast('DELTA_PATCH', deltaPacket);
  }
}, 500);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏙️  CITY MASTER: MMO Isometric Simulation Server Live`);
  console.log(`🌐  Listening on http://localhost:${PORT}`);
  console.log(`🎮  50 Firms Active, 10 Legislative Districts Generated`);
  console.log(`⚡  20Hz Delta Compression Engine Running`);
  console.log(`=======================================================`);
});
