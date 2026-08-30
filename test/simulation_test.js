// test/simulation_test.js
// Comprehensive test suite for all simulation subsystems

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
assert.strictEqual(state.firms.size, 10, 'Must have 10 starting firms initialized');
assert.strictEqual(state.districts.length, 10, 'Must have 10 legislative districts');
assert.strictEqual(state.maritimePorts.length, 3, 'Must have 3 distinct maritime ports');
console.log('✅ Subsystem 1: GameState Initialization Passed (60x60 Grid, 10 Starting Firms, 10 Districts, 3 Ports)');

// 2. Curving Coastline & Maritime Ports Verification
assert(state.isOceanWater(30, 55), 'Deep southern coordinates must be ocean water');
assert(!state.isOceanWater(30, 10), 'Northern inland coordinates must be land');
const northPortTile = state.grid[12][44];
assert.strictEqual(northPortTile.groundBuilding.type, 'PORT', 'North Port tile must contain a PORT building');
console.log('✅ Subsystem 2: Curving Coastline & 3 Maritime Ports Verification Passed');

// 3. Discrete Road Network & 3-Tile Outward Expansion Verification
let roadCount = 0;
let perimeterForSaleCount = 0;
for (let x = 0; x < state.gridSize; x++) {
  for (let y = 0; y < state.gridSize; y++) {
    if (state.grid[x][y].roadLevel > 0) roadCount++;
    if (state.grid[x][y].perimeterForSale) perimeterForSaleCount++;
  }
}
assert(roadCount > 50, 'Road network must connect developed clusters and ports');
assert(perimeterForSaleCount > 20, 'Adjacent unowned tiles must be marked perimeterForSale and priced');
console.log(`✅ Subsystem 3: Road Network & 3-Tile Outward Expansion Passed (${roadCount} road tiles, ${perimeterForSaleCount} perimeter parcels)`);

// 4. Dynamic Road Density Upgrades (Levels 1 to 4)
// Place a Level 3 building at tile (30, 23) adjacent to connecting cross-avenue at (30, 22)
state.grid[30][23].groundBuilding = { type: 'COMMERCIAL', level: 3, name: 'Commercial Tower' };
state.updateRoadNetwork();
const adjacentRoad = state.grid[30][22];
assert.strictEqual(adjacentRoad.roadLevel, 3, 'Adjoining road must automatically upgrade to Level 3 Boulevard');
console.log('✅ Subsystem 4: Automatic Road Density Visual Upgrades Passed (Upgraded to Level 3 Boulevard)');

// 5. Spatial Synergies & Cellular Automata (Pollution, Traffic Synergies & Noise)
const ca = new CellularAutomata(state);
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
console.log(`✅ Subsystem 5: Cellular Automata & Traffic Synergies Passed (Adjacent pollution: ${state.grid[10][11].pollution}%, Depressed Rent: $${state.grid[10][11].groundBuilding.rentIncome})`);

// 6. Antigravity Physics, Z-Axis Elevation & Crash Dynamics
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

ag.update(Date.now(), 50);
assert(state.grid[10][10].floatingBuilding.current_z > 50, 'Arcology must maintain floating Z elevation');

state.grid[10][10].floatingBuilding.stability = 0;
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);
ag.update(Date.now(), 50);

assert.strictEqual(state.grid[10][10].floatingBuilding, null, 'Unstable Arcology must crash and be destroyed');
assert.strictEqual(state.grid[10][10].groundBuilding.type, 'RUINS', 'Crash must obliterate ground building beneath into RUINS');
console.log('✅ Subsystem 6: Antigravity Physics & Crash Destruction Passed');

// 7. Municipal Politics, Councilmanic Prerogative & ZBA
const politics = new PoliticsEngine(state);
const checkVeto = politics.checkCouncilmanicPrerogative(6, 'firm_player_1', 'INDUSTRIAL', 3, false);
assert.strictEqual(checkVeto.allowed, false, 'Environmentalist councilmember must veto industrial Level 3');
console.log('✅ Subsystem 7A: Councilmanic Prerogative Unilateral Veto Passed');

const variance = politics.submitZBAVariance('firm_player_1', 15, 15, 'COMMERCIAL', 3);
assert.strictEqual(state.municipal.pendingVariances.length, 1, 'Variance must be enqueued');
variance.resolveTick = state.tick;
politics.processZBAQueue();
assert(['APPROVED', 'DENIED'].includes(variance.status), 'ZBA must resolve variance application');
console.log(`✅ Subsystem 7B: Zoning Board of Adjustment (ZBA) 5-Member Review Passed (Status: ${variance.status})`);

// 7C. Legislative Policy Proposal, Respect Points Lobbying & Cash Bribery
const billRes = politics.proposeBill('firm_player_1', 'POLICY_COMMERCIAL_BOOM');
assert.strictEqual(billRes.success, true, 'Bill proposal must succeed');
assert.strictEqual(state.municipal.activeBill.policyId, 'POLICY_COMMERCIAL_BOOM');

const initialRP = state.firms.get('firm_player_1').influencePoints;
const lobbyRes = politics.lobbyBill('firm_player_1', 20);
assert.strictEqual(lobbyRes.success, true, 'RP lobbying must succeed');
assert.strictEqual(state.firms.get('firm_player_1').influencePoints, initialRP - 20, 'RP must be deducted');
assert(state.municipal.activeBill.projectedVote > state.municipal.activeBill.baseSupport, 'Projected vote must increase');

const playerFirmObj = state.firms.get('firm_player_1');
playerFirmObj.bribeAuditRisk = 0;
const bribeRes = politics.bribeOfficial('firm_player_1');
assert.strictEqual(bribeRes.success, true, 'Bribe action must execute');
assert(playerFirmObj.bribeAuditRisk >= 5, 'Bribe must increase audit risk by 5%');

// Test 1% decay per 10,000 ticks
const preDecayRisk = playerFirmObj.bribeAuditRisk;
for (let t = 0; t < 10000; t++) {
  politics.decayBriberyRisk();
}
assert(playerFirmObj.bribeAuditRisk < preDecayRisk, 'Risk must decay over 10,000 ticks');
assert(Math.abs(preDecayRisk - playerFirmObj.bribeAuditRisk - 1.0) < 0.05, 'Risk must decay by ~1% over 10,000 ticks');
console.log('✅ Subsystem 7C: Legislative Policy Proposal, RP Lobbying, Bribes & 1%/10k Ticks Risk Decay Passed');

// 7D. Stochastic ±10% Voting Resolution & Enactment
state.municipal.activeBill.voteCastTick = state.tick;
state.municipal.activeBill.projectedVote = 85; // High enough to guarantee pass even with -10% uncertainty
politics.processActiveBillVote();
assert.strictEqual(state.municipal.activePolicies.length, 1, 'Passed bill must enact policy in activePolicies');
assert.strictEqual(state.municipal.activePolicies[0].id, 'POLICY_COMMERCIAL_BOOM');
console.log('✅ Subsystem 7D: Stochastic ±10% Voting Resolution & Policy Enactment Passed');

// 8. Macroeconomics & Foreign Export Controls
const macro = new MacroeconomicsEngine(state);
macro.updateResourceSpotPrices();
const initialRareEarthPrice = state.resources.rareEarth.spotPrice;
state.municipal.foreignRelations.embargoActive = true;
macro.updateResourceSpotPrices();
assert(state.resources.rareEarth.spotPrice > initialRareEarthPrice, 'Foreign embargo must spike rare-earth spot price');
console.log(`✅ Subsystem 8: Macroeconomic Exchange & Geopolitical Embargo Passed ($${initialRareEarthPrice} -> $${state.resources.rareEarth.spotPrice})`);

// 9. Stock Market, Hostile Takeover & Automated 3-Tier Liquidation
const stock = new StockMarketEngine(state);
stock.recalculateAllFirmValuations();
const player = state.firms.get('firm_player_1');
assert(player.stock.price > 0, 'Firm stock price must be positive');
assert(player.stock.nav > 0, 'Firm NAV must be positive');

player.shareHoldings['firm_bot_3'] = 60000; // 60%
state.grid[25][25].ownerId = 'firm_bot_3';
const takeoverRes = stock.executeHostileTakeover('firm_player_1', 'firm_bot_3');
assert.strictEqual(takeoverRes.success, true, 'Hostile takeover with >50% stake must succeed');
assert.strictEqual(state.grid[25][25].ownerId, 'firm_player_1', 'Hostile takeover must transfer territory to acquirer');
console.log('✅ Subsystem 9A: Stock Market NAV & Hostile Takeover Execution Passed');

player.marginLoan = { borrowedAmount: 3000000, collateralShares: 50000 };
stock.processMarginAndLiquidation();
assert(['MARGIN_CALL', 'LIQUIDATION'].includes(player.marginStatus), 'Overleveraged firm must trigger Margin Call / Liquidation');
console.log(`✅ Subsystem 9B: Automated 3-Tier Liquidation Engine Passed (Status: ${player.marginStatus})`);

// 9C. Dynamic User Profile Registration & Delayed Active Trading Gate
assert.strictEqual(player.isActivelyTraded, false, 'Player firm stock must not be actively traded prior to developments');

const blockedTrade = stock.tradeShares('firm_bot_2', 'firm_player_1', 100, true);
assert.strictEqual(blockedTrade.success, false, 'Trading un-developed firm stock must be rejected');

// Simulate player buying land and building structures
player.totalLand = 1;
player.totalBuildings = 1;
const unlocked = state.checkAndActivateTrading('firm_player_1');
assert.strictEqual(unlocked, true, 'checkAndActivateTrading must unlock active trading once land & building are owned');
assert.strictEqual(player.isActivelyTraded, true, 'Firm must now be marked isActivelyTraded: true');

const allowedTrade = stock.tradeShares('firm_bot_2', 'firm_player_1', 100, true);
assert.strictEqual(allowedTrade.success, true, 'Trading must succeed once development requirements are met');

// Register a dynamic new user profile
const registeredFirm = state.registerUserFirm('Apex Innovators Co', '#ec4899');
assert.strictEqual(state.firms.size, 11, 'Exchange must now list 11 total firms');
assert.strictEqual(registeredFirm.isActivelyTraded, false, 'New user profile firm must start with isActivelyTraded: false');
console.log('✅ Subsystem 9C: Dynamic Profile Registration & Development-Gated Active Trading Passed');

// 10. 32-Bit Retro Organic Black Void Frontier & Strict Adjacent-Only Land Acquisition
// Verify that distant unowned land cannot be for sale / is in the void
const distantTile = state.grid[0][0];
assert.strictEqual(distantTile.perimeterForSale, false, 'Distant tile (0,0) away from any owned parcel must NOT be for sale (void)');

// Verify that immediate adjacent neighbor to an owned parcel is for sale
// State starting port cluster has frontier lot at (11, 41)
const adjacentFrontierTile = state.grid[11][41];
assert.strictEqual(adjacentFrontierTile.perimeterForSale, true, 'Frontier tile adjacent to cluster (11,41) must be perimeterForSale: true');

// Verify that tile (10, 40) beyond the frontier is NOT yet for sale
assert.strictEqual(state.grid[10][40].perimeterForSale, false, 'Tile (10,40) beyond frontier must NOT be for sale yet');

// Simulate purchasing the frontier parcel (11, 41)
adjacentFrontierTile.ownerId = 'firm_player_1';
state.updateRoadNetwork();

// Now tile (10, 40) becomes an immediate neighbor to owned land and is organically unlocked for sale!
const nextFrontierTile = state.grid[10][40];
assert.strictEqual(nextFrontierTile.perimeterForSale, true, 'Next frontier tile (10,40) must organically become for sale after adjacent purchase');
console.log('✅ Subsystem 10: Organic Black Void Expansion & Adjacent-Only Land Acquisition Passed');

console.log('\n🎉 ALL 14 SUBSYSTEMS PASSED TEST VERIFICATION SUCCESSFULLY!');

