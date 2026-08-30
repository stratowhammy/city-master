// server/engine/BotAI.js
// Autonomous simulated competitor firms with distinct behavioral personalities

class BotAI {
  constructor(gameState, politicsEngine, stockEngine, macroEngine, antigravityEngine) {
    this.gameState = gameState;
    this.politics = politicsEngine;
    this.stock = stockEngine;
    this.macro = macroEngine;
    this.antigravity = antigravityEngine;
    this.enabled = false; // Autonomous player bots disabled by default
  }

  update() {
    // If autonomous bot execution is disabled, do nothing
    if (!this.enabled) return;

    // Only run bot logic every 15 ticks (~7.5s) to conserve CPU
    if (this.gameState.tick % 15 !== 0) return;

    for (const [firmId, firm] of this.gameState.firms.entries()) {
      if (firm.isHuman) continue; // Skip human player

      // Don't act if frozen under margin call
      if (firm.marginStatus === 'MARGIN_CALL' || firm.marginStatus === 'LIQUIDATION') {
        // AI attempts to fix margin call by selling unneeded stock or land
        if (firm.cash < 5000) {
          // Sell some stocks
          for (const [targetId, count] of Object.entries(firm.shareHoldings || {})) {
            if (targetId !== firm.id && count > 100) {
              this.stock.tradeShares(firm.id, targetId, Math.min(count, 500), false);
              break;
            }
          }
        }
        continue;
      }

      // Personality-driven behavior
      const rand = Math.random();

      // 1. Resource purchasing
      if (firm.cash > 25000) {
        if (firm.inventory.concrete < 50) this.macro.buyResource(firm.id, 'concrete', 30);
        if (firm.inventory.steel < 30) this.macro.buyResource(firm.id, 'steel', 20);
        if (firm.inventory.timber < 50) this.macro.buyResource(firm.id, 'timber', 30);

        if (firm.personality === 'SPECULATOR' && firm.inventory.rareEarth < 25) {
          this.macro.buyResource(firm.id, 'rareEarth', 10);
          this.macro.buyResource(firm.id, 'superconductors', 5);
        }
      }

      // 2. Land Acquisition & Construction
      if (rand < 0.35 && firm.cash > 20000) {
        this.attemptBotBuilding(firm);
      }

      // 3. Stock Market Trading & Speculation
      if (rand < 0.25) {
        this.attemptBotStockTrading(firm);
      }

      // 4. Political Influence & Campaigning
      if (rand < 0.15 && firm.influencePoints < 50 && firm.cash > 30000) {
        // Donate cash to gain influence points
        firm.cash -= 10000;
        firm.influencePoints += 20;
        this.gameState.markFirmDirty(firm.id);
      }
    }
  }

  attemptBotBuilding(firm) {
    const size = this.gameState.gridSize;
    // Search random tile to buy or upgrade
    const rx = Math.floor(Math.random() * size);
    const ry = Math.floor(Math.random() * size);
    const tile = this.gameState.grid[rx][ry];

    if (tile.isWater) return;

    // A. Buy unowned land
    if (!tile.ownerId && firm.cash >= tile.landValue) {
      tile.ownerId = firm.id;
      firm.cash -= tile.landValue;
      firm.totalLand++;

      // Assign zoning based on district or bot personality
      if (firm.personality === 'ECO') tile.zoning = 'RESIDENTIAL';
      else if (firm.personality === 'TYCOON') tile.zoning = Math.random() > 0.5 ? 'COMMERCIAL' : 'INDUSTRIAL';
      else if (firm.personality === 'SPECULATOR') tile.zoning = 'COMMERCIAL';
      else tile.zoning = 'RESIDENTIAL';

      this.gameState.markTileDirty(rx, ry);
      this.gameState.markFirmDirty(firm.id);
      return;
    }

    // B. Build or Upgrade on owned land
    if (tile.ownerId === firm.id) {
      const isUnion = (firm.personality === 'UNION_LOYAL' || firm.unionLoyalty > 60);

      // Construct Level 1 building if empty
      if (!tile.groundBuilding) {
        const cost = isUnion ? 18000 : 12000;
        if (firm.cash < cost) return;

        firm.cash -= cost;
        const bType = tile.zoning === 'NONE' ? 'RESIDENTIAL' : tile.zoning;
        tile.groundBuilding = {
          type: bType,
          level: 1,
          name: `${firm.name.split(' ')[0]} ${bType.toLowerCase()} L1`,
          constructedTick: this.gameState.tick,
          health: 100,
          taxAbatedUntil: 0,
          unionBuilt: isUnion,
          rentIncome: 70,
          pollution: bType === 'INDUSTRIAL' ? 25 : 0,
          crime: bType === 'COMMERCIAL' ? 10 : 0,
          population: bType === 'RESIDENTIAL' ? 100 : 0,
          workers: bType === 'COMMERCIAL' ? 50 : 30
        };

        if (isUnion) {
          this.politics.grantTaxAbatement(firm.id, rx, ry, true);
        }

        this.gameState.markTileDirty(rx, ry);
        this.gameState.markFirmDirty(firm.id);
        return;
      }

      // Upgrade ground building to L2 / L3
      if (tile.groundBuilding && tile.groundBuilding.level < 3 && firm.cash > 35000) {
        tile.groundBuilding.level++;
        firm.cash -= 25000;
        tile.groundBuilding.name = `${firm.name.split(' ')[0]} High-Rise L${tile.groundBuilding.level}`;
        this.gameState.markTileDirty(rx, ry);
        this.gameState.markFirmDirty(firm.id);
        return;
      }

      // Speculator builds Level 4 Antigravity Arcology
      if (firm.personality === 'SPECULATOR' && !tile.floatingBuilding && firm.cash > 120000 && firm.inventory.rareEarth >= 15) {
        // Check Councilmanic Prerogative
        const check = this.politics.checkCouncilmanicPrerogative(tile.districtId, firm.id, 'ARCOLOGY', 4, false);
        if (!check.allowed) return;

        firm.cash -= 90000;
        firm.inventory.rareEarth -= 10;
        firm.inventory.superconductors -= 5;
        firm.totalArcologies = (firm.totalArcologies || 0) + 1;

        tile.floatingBuilding = {
          type: 'ARCOLOGY',
          level: 4,
          name: `${firm.name.split(' ')[0]} Sky Arcology`,
          constructedTick: this.gameState.tick,
          z_offset: 64,
          target_z: 64,
          current_z: 64,
          health: 100,
          stability: 100,
          rareEarthRate: 1,
          superconductorRate: 1,
          maintenanceCash: 250,
          rentIncome: 380,
          taxAbatedUntil: 0,
          unionBuilt: isUnion,
          population: 500,
          residentsUsingFlyingTransit: true
        };

        this.gameState.addNews(
          `ANTIGRAVITY LAUNCH: ${firm.name} deployed floating Level 4 Arcology in District ${tile.districtId}!`,
          'success',
          { x: rx, y: ry }
        );

        this.gameState.markTileDirty(rx, ry);
        this.gameState.markFirmDirty(firm.id);
      }
    }
  }

  attemptBotStockTrading(firm) {
    // Pick a random firm
    const firmsList = Array.from(this.gameState.firms.values());
    const target = firmsList[Math.floor(Math.random() * firmsList.length)];
    if (!target || target.id === firm.id) return;

    // If target has low price compared to NAV -> buy
    if (target.stock.price < target.stock.nav && firm.cash > 20000 && target.stock.publicShares > 100) {
      const buyCount = Math.min(200, Math.floor(firm.cash * 0.15 / target.stock.price));
      if (buyCount > 10) {
        this.stock.tradeShares(firm.id, target.id, buyCount, true);

        // Check if takeover is possible
        const owned = firm.shareHoldings[target.id] || 0;
        if (owned > 50000 && firm.personality === 'TYCOON') {
          this.stock.executeHostileTakeover(firm.id, target.id);
        }
      }
    }
  }

  // Evaluate incoming land acquisition bids from players/firms
  evaluateLandBid(bid) {
    const tile = this.gameState.grid[bid.tileX] && this.gameState.grid[bid.tileX][bid.tileY];
    if (!tile) return { action: 'REJECT', message: 'Invalid property location.' };

    const baselineValue = Math.max(3000, tile.landValue || tile.basePrice || 5000);

    if (bid.offerType === 'CASH') {
      const offeredCash = Number(bid.cashAmount) || 0;
      if (offeredCash >= baselineValue * 1.25) {
        return {
          action: 'ACCEPT',
          message: `Offer accepted! Property acquired for $${offeredCash.toLocaleString()}.`
        };
      } else if (offeredCash >= baselineValue * 0.85) {
        const counter = Math.round(baselineValue * 1.35);
        return {
          action: 'COUNTER',
          counterCash: counter,
          message: `Counterbid: Property available for $${counter.toLocaleString()}.`
        };
      } else {
        return {
          action: 'REJECT',
          message: `Offer of $${offeredCash.toLocaleString()} rejected (property appraisal is $${baselineValue.toLocaleString()}).`
        };
      }
    } else if (bid.offerType === 'STOCK') {
      const bidderFirm = this.gameState.firms.get(bid.fromFirmId);
      const sharePrice = bidderFirm && bidderFirm.stock ? bidderFirm.stock.price : 50;
      const shares = Number(bid.stockShares) || 0;
      const totalStockVal = shares * sharePrice;

      if (totalStockVal >= baselineValue * 1.20) {
        return {
          action: 'ACCEPT',
          message: `Stock swap accepted! Exchanged land parcel for ${shares.toLocaleString()} shares of ${bidderFirm ? bidderFirm.name : 'Bidder Stock'}.`
        };
      } else {
        const neededShares = Math.ceil((baselineValue * 1.35) / Math.max(1, sharePrice));
        return {
          action: 'COUNTER',
          counterShares: neededShares,
          message: `Counterbid: We require ${neededShares.toLocaleString()} shares of stock for this parcel.`
        };
      }
    } else if (bid.offerType === 'JOINT_VENTURE') {
      const equity = Number(bid.equityPercent) || 0;
      if (equity >= 20) {
        return {
          action: 'ACCEPT',
          message: `Joint-venture partnership established! Contributing parcel for ${equity}% equity stake in future development revenue.`
        };
      } else {
        return {
          action: 'COUNTER',
          counterEquity: 25,
          message: `Counterbid: We require a minimum of 25% joint-venture equity stake to contribute this parcel.`
        };
      }
    }

    return { action: 'REJECT', message: 'Offer could not be evaluated.' };
  }
}

module.exports = BotAI;
