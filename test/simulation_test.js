// test/simulation_test.js
// Comprehensive test suite for all blueprint subsystems

const assert = require('node:assert');
const GameState = require('../server/engine/GameState');
const AntigravityEngine = require('../server/engine/AntigravityEngine');
const CellularAutomata = require('../server/engine/CellularAutomata');
const PoliticsEngine = require('../server/engine/PoliticsEngine');
const MacroeconomicsEngine = require('../server/engine/MacroeconomicsEngine');
const StockMarketEngine = require('../server/engine/StockMarketEngine');
const BotAI = require('../server/engine/BotAI');

console.log('🧪 Starting City Master Simulation Engine Test Suite...\n');

// 1. Initialize Game State
const state = new GameState();
assert.strictEqual(state.gridSize, 60, 'Grid size must be 60x60');
assert.strictEqual(state.firms.size, 50, 'Must have 50 firms initialized');
assert.strictEqual(state.districts.length, 10, 'Must have 10 legislative districts');
console.log('✅ Subsystem 1: GameState Initialization Passed (60x60 Grid, 50 Firms, 10 Districts)');

// 2. Spatial Synergies & Cellular Automata
const ca = new CellularAutomata(state);
// Place dirty industrial building next to residential building
state.grid[10][10].ownerId = 'firm_player_1';
state.grid[10][10].zoning = 'INDUSTRIAL';
state.grid[10][10].groundBuilding = {
  type: 'INDUSTRIAL',
  level: 3,
  name: 'Heavy Industrial Refinery',
  constructedTick: 0,
  health: 100,
  taxAbatedUntil: 0,
  unionBuilt: true,
  rentIncome: 150,
  pollution: 80,
  crime: 10,
  population: 0,
  workers: 200
};

state.grid[10][11].ownerId = 'firm_bot_2';
state.grid[10][11].zoning = 'RESIDENTIAL';
state.grid[10][11].groundBuilding = {
  type: 'RESIDENTIAL',
  level: 3,
  name: 'Luxury Residential Tower',
  constructedTick: 0,
  health: 100,
  taxAbatedUntil: 0,
  unionBuilt: true,
  rentIncome: 240,
  pollution: 0,
  crime: 0,
  population: 400,
  workers: 0
};

ca.update();
assert(state.grid[10][11].pollution > 20, 'Adjacent residential tile must receive industrial pollution');
assert(state.grid[10][11].groundBuilding.rentIncome < 240, 'Pollution must depress residential rent income');
console.log(`✅ Subsystem 2: Cellular Automata & Indirect PvP Passed (Adjacent pollution: ${state.grid[10][11].pollution}%, Depressed Rent: $${state.grid[10][11].groundBuilding.rentIncome})`);

// 3. Antigravity Physics, Z-Axis Elevation & Crash Dynamics
const ag = new AntigravityEngine(state);
state.grid[10][10].floatingBuilding = {
  type: 'ARCOLOGY',
  level: 4,
  name: 'Floating Quantum Arcology',
  constructedTick: 0,
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
  unionBuilt: true,
  population: 650,
  residentsUsingFlyingTransit: true
};

// Update antigravity with bobbing
ag.update(Date.now(), 50);
assert(state.grid[10][10].floatingBuilding.current_z > 50, 'Arcology must maintain floating Z elevation');

// Test resource starvation -> Crash!
state.grid[10][10].floatingBuilding.stability = 0;
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);

assert.strictEqual(state.grid[10][10].floatingBuilding, null, 'Unstable Arcology must crash and be destroyed');
assert.strictEqual(state.grid[10][10].groundBuilding.type, 'RUINS', 'Crash must obliterate ground building beneath into RUINS');
console.log('✅ Subsystem 3: Antigravity Physics & Crash Destruction Passed');

// 4. Municipal Politics, Councilmanic Prerogative & ZBA
const politics = new PoliticsEngine(state);
// District 6 is Radical Environmentalist (Tara Green) -> vetoes industrial building
const checkVeto = politics.checkCouncilmanicPrerogative(6, 'firm_player_1', 'INDUSTRIAL', 3, false);
assert.strictEqual(checkVeto.allowed, false, 'Environmentalist councilmember must veto industrial Level 3');
console.log('✅ Subsystem 4A: Councilmanic Prerogative Unilateral Veto Passed');

// Submit ZBA variance
const variance = politics.submitZBAVariance('firm_player_1', 15, 15, 'COMMERCIAL', 3);
assert.strictEqual(state.municipal.pendingVariances.length, 1, 'Variance must be enqueued');
variance.resolveTick = state.tick;
politics.processZBAQueue();
assert(['APPROVED', 'DENIED'].includes(variance.status), 'ZBA must resolve variance application');
console.log(`✅ Subsystem 4B: Zoning Board of Adjustment (ZBA) 5-Member Review Passed (Status: ${variance.status})`);

// 5. Macroeconomics & Foreign Export Controls
const macro = new MacroeconomicsEngine(state);
macro.updateResourceSpotPrices();
const initialRareEarthPrice = state.resources.rareEarth.spotPrice;
state.municipal.foreignRelations.embargoActive = true;
macro.updateResourceSpotPrices();
assert(state.resources.rareEarth.spotPrice > initialRareEarthPrice, 'Foreign embargo must spike rare-earth spot price');
console.log(`✅ Subsystem 5: Macroeconomic Exchange & Geopolitical Embargo Passed ($${initialRareEarthPrice} -> $${state.resources.rareEarth.spotPrice})`);

// 6. Stock Market, Hostile Takeover & Automated 3-Tier Liquidation
const stock = new StockMarketEngine(state);
stock.recalculateAllFirmValuations();
const player = state.firms.get('firm_player_1');
const rival = state.firms.get('firm_bot_3');
assert(player.stock.price > 0, 'Firm stock price must be positive');
assert(player.stock.nav > 0, 'Firm NAV must be positive');

// Test Hostile Takeover (>50% shares)
player.shareHoldings['firm_bot_3'] = 60000; // 60%
state.grid[25][25].ownerId = 'firm_bot_3';
const takeoverRes = stock.executeHostileTakeover('firm_player_1', 'firm_bot_3');
assert.strictEqual(takeoverRes.success, true, 'Hostile takeover with >50% stake must succeed');
assert.strictEqual(state.grid[25][25].ownerId, 'firm_player_1', 'Hostile takeover must transfer territory to acquirer');
console.log('✅ Subsystem 6A: Stock Market NAV & Hostile Takeover Execution Passed');

// Test Automated 3-Tier Liquidation
player.marginLoan = { borrowedAmount: 3000000, collateralShares: 50000 };
stock.processMarginAndLiquidation();
assert(['MARGIN_CALL', 'LIQUIDATION'].includes(player.marginStatus), 'Overleveraged firm must trigger Margin Call / Liquidation');
console.log(`✅ Subsystem 6B: Automated 3-Tier Liquidation Engine Passed (Status: ${player.marginStatus})`);

console.log('\n🎉 ALL 6 SUBSYSTEMS PASSED TEST VERIFICATION SUCCESSFULLY!');
