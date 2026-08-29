// server/engine/StockMarketEngine.js
// Stock market simulation, NAV valuation, equity trading, hostile takeovers,
// collateralized margin loans, and the automated 3-tier liquidation engine.

class StockMarketEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update() {
    const isMarketTick = this.gameState.tick % 4 === 0;

    if (isMarketTick) {
      this.recalculateAllFirmValuations();
      this.processMarginAndLiquidation();
    }
  }

  // Calculate Net Asset Value (NAV) and stock prices for all 50 firms
  recalculateAllFirmValuations() {
    for (const [firmId, firm] of this.gameState.firms.entries()) {
      let totalLandValue = 0;
      let totalBuildingCost = 0;
      let totalRentalIncome = 0;
      let totalMaintenance = 0;
      let buildingCount = 0;
      let arcologyCount = 0;
      let landCount = 0;

      // Scan grid for firm's assets
      for (let x = 0; x < this.gameState.gridSize; x++) {
        for (let y = 0; y < this.gameState.gridSize; y++) {
          const tile = this.gameState.grid[x][y];
          if (tile.ownerId === firmId) {
            landCount++;
            totalLandValue += tile.landValue;

            if (tile.groundBuilding) {
              buildingCount++;
              totalBuildingCost += tile.groundBuilding.level * 25000;
              totalRentalIncome += tile.groundBuilding.rentIncome || 0;
              totalMaintenance += (tile.groundBuilding.level * 15);
            }

            if (tile.floatingBuilding) {
              arcologyCount++;
              totalBuildingCost += 180000; // High capital value of Level 4 Arcology
              totalRentalIncome += tile.floatingBuilding.rentIncome || 0;
              totalMaintenance += (tile.floatingBuilding.maintenanceCash || 250);
            }
          }
        }
      }

      firm.totalLand = landCount;
      firm.totalBuildings = buildingCount;
      firm.totalArcologies = arcologyCount;
      firm.hourlyRevenue = totalRentalIncome;
      firm.hourlyMaintenance = totalMaintenance;

      // Pay net rent revenue or maintenance into cash balance every market tick
      const netCashflow = Math.round(totalRentalIncome - totalMaintenance);
      firm.cash += Math.round(netCashflow * 0.2); // Pro-rated tick income

      // Net Present Value (NPV) of projected rental income stream (~20 periods)
      const npvRental = totalRentalIncome * 20;

      // Total firm assets
      const totalAssets = totalLandValue + totalBuildingCost + Math.max(0, firm.cash) + npvRental;
      const totalDebt = (firm.marginLoan ? firm.marginLoan.borrowedAmount : 0);
      const netAssetValue = Math.max(10000, totalAssets - totalDebt);

      const totalShares = firm.stock.totalShares || 100000;
      const computedNAV = +(netAssetValue / totalShares).toFixed(2);
      firm.stock.nav = computedNAV;

      // Market price floats toward NAV with momentum
      const targetPrice = computedNAV * (0.95 + Math.random() * 0.1);
      firm.stock.price = +(firm.stock.price * 0.85 + targetPrice * 0.15).toFixed(2);
      if (firm.stock.price < 1.0) firm.stock.price = 1.0;

      firm.stock.history.push(firm.stock.price);
      if (firm.stock.history.length > 500) firm.stock.history.shift();

      // Total Net Worth calculation (including stock holdings)
      let portfolioValue = 0;
      for (const [targetId, shares] of Object.entries(firm.shareHoldings || {})) {
        const targetFirm = this.gameState.firms.get(targetId);
        if (targetFirm && shares > 0) {
          portfolioValue += shares * targetFirm.stock.price;
        }
      }

      firm.netWorth = Math.round(firm.cash + totalLandValue + totalBuildingCost + portfolioValue - totalDebt);
      this.gameState.markFirmDirty(firmId);
    }
  }

  // Margin loans and Automated 3-Tier Liquidation Engine
  processMarginAndLiquidation() {
    for (const [firmId, firm] of this.gameState.firms.entries()) {
      const loan = firm.marginLoan;
      if (!loan || loan.borrowedAmount <= 0) {
        firm.marginStatus = 'HEALTHY';
        firm.marginGraceExpiry = null;
        continue;
      }

      // 1. Calculate Margin Metrics
      // Equity = Net Worth (Cash + Assets - Loans)
      const equity = firm.netWorth;
      const usedMargin = loan.borrowedAmount;
      const marginRatio = usedMargin > 0 ? (equity / usedMargin) * 100 : 999;

      firm.calculatedEquity = equity;
      firm.calculatedUsedMargin = usedMargin;
      firm.calculatedMarginRatio = Math.round(marginRatio);

      // 2. Evaluate 3 Escalating Threshold Tiers
      if (marginRatio >= 130) {
        firm.marginStatus = 'HEALTHY';
        firm.marginGraceExpiry = null;
      } else if (marginRatio >= 110) {
        // Tier 1: Early-Warning Level
        firm.marginStatus = 'EARLY_WARNING';
        firm.marginGraceExpiry = null;
        if (firm.isHuman && this.gameState.tick % 20 === 0) {
          this.gameState.addNews(
            `MARGIN WARNING: Account buffer thinning! Margin ratio at ${Math.round(marginRatio)}%. Consider depositing cash or deleveraging.`,
            'warning'
          );
        }
      } else if (marginRatio >= 100) {
        // Tier 2: Margin Call Level (Grace Period)
        if (firm.marginStatus !== 'MARGIN_CALL') {
          firm.marginStatus = 'MARGIN_CALL';
          firm.marginGraceExpiry = this.gameState.tick + 60; // 60 ticks (~30s) grace period
          if (firm.isHuman) {
            this.gameState.addNews(
              `MARGIN CALL: Hard threshold breached (Ratio: ${Math.round(marginRatio)}%)! 60-tick Grace Period initiated. New construction FROZEN.`,
              'critical',
              { marginRatio: Math.round(marginRatio), graceExpiry: firm.marginGraceExpiry }
            );
          }
        } else if (this.gameState.tick >= firm.marginGraceExpiry) {
          // Grace period expired without cure -> escalate to Liquidation
          this.executeLiquidation(firm);
        }
      } else {
        // Tier 3: Liquidation Level (Critical minimum breached!)
        firm.marginStatus = 'LIQUIDATION';
        this.executeLiquidation(firm);
      }

      this.gameState.markFirmDirty(firmId);
    }
  }

  // Tier 3 Automated Liquidation Execution
  executeLiquidation(firm) {
    const loan = firm.marginLoan;
    if (!loan || loan.borrowedAmount <= 0) return;

    let debtToClear = Math.round(loan.borrowedAmount * 0.6); // Liquidate enough to restore healthy ratio
    let cashRecovered = 0;

    this.gameState.addNews(
      `LIQUIDATION ENGINE TRIGGERED: Central Bank seized assets of ${firm.name} to satisfy outstanding loans!`,
      'critical'
    );

    // 1. Sell off foreign stock holdings first (Most Liquid First)
    for (const [targetId, shares] of Object.entries(firm.shareHoldings || {})) {
      if (debtToClear <= 0) break;
      if (targetId !== firm.id && shares > 0) {
        const targetFirm = this.gameState.firms.get(targetId);
        if (targetFirm) {
          const sellCount = Math.min(shares, Math.ceil(debtToClear / (targetFirm.stock.price * 0.7)));
          const revenue = Math.round(sellCount * targetFirm.stock.price * 0.7); // 30% fire-sale penalty
          firm.shareHoldings[targetId] -= sellCount;
          targetFirm.stock.publicShares += sellCount;
          debtToClear -= revenue;
          cashRecovered += revenue;
        }
      }
    }

    // 2. Liquidate un-upgraded / lowest-value land or buildings
    if (debtToClear > 0) {
      for (let x = 0; x < this.gameState.gridSize; x++) {
        for (let y = 0; y < this.gameState.gridSize; y++) {
          if (debtToClear <= 0) break;
          const tile = this.gameState.grid[x][y];
          if (tile.ownerId === firm.id) {
            const fireSaleVal = Math.round(tile.landValue * 0.5);
            tile.ownerId = null; // Reverted to municipal ownership
            tile.groundBuilding = null;
            if (tile.floatingBuilding) {
              tile.floatingBuilding = null;
              firm.totalArcologies = Math.max(0, firm.totalArcologies - 1);
            }
            debtToClear -= fireSaleVal;
            cashRecovered += fireSaleVal;
            this.gameState.markTileDirty(x, y);
          }
        }
      }
    }

    // Apply recovered cash to pay down loan
    loan.borrowedAmount = Math.max(0, loan.borrowedAmount - cashRecovered);
    const remainingRatio = loan.borrowedAmount > 0 ? (firm.netWorth / loan.borrowedAmount) * 100 : 999;
    
    if (loan.borrowedAmount === 0 || remainingRatio >= 130) {
      firm.marginStatus = 'HEALTHY';
      firm.marginGraceExpiry = null;
    } else if (remainingRatio >= 110) {
      firm.marginStatus = 'EARLY_WARNING';
    } else if (remainingRatio >= 100) {
      firm.marginStatus = 'MARGIN_CALL';
    } else {
      firm.marginStatus = 'LIQUIDATION';
    }

    this.gameState.markFirmDirty(firm.id);
  }

  tradeShares(buyerFirmId, targetFirmId, count, isBuy) {
    const buyer = this.gameState.firms.get(buyerFirmId);
    const target = this.gameState.firms.get(targetFirmId);
    if (!buyer || !target || count <= 0) return { success: false, reason: 'Invalid parameters' };

    if (target.isActivelyTraded === false) {
      return {
        success: false,
        reason: `Trading Not Available: ${target.name} has not completed initial developments yet (must purchase properties and build structures).`
      };
    }

    const totalCost = Math.round(count * target.stock.price);

    if (isBuy) {
      if (buyer.cash < totalCost) return { success: false, reason: `Insufficient cash ($${totalCost.toLocaleString()} needed)` };
      if (target.stock.publicShares < count) return { success: false, reason: `Only ${target.stock.publicShares.toLocaleString()} shares available on open market` };

      buyer.cash -= totalCost;
      target.stock.publicShares -= count;
      buyer.shareHoldings[targetFirmId] = (buyer.shareHoldings[targetFirmId] || 0) + count;
      target.stock.price = +(target.stock.price * 1.02).toFixed(2); // Buy pressure
    } else {
      const owned = buyer.shareHoldings[targetFirmId] || 0;
      if (owned < count) return { success: false, reason: `You only own ${owned.toLocaleString()} shares of ${target.name}` };

      buyer.shareHoldings[targetFirmId] -= count;
      target.stock.publicShares += count;
      buyer.cash += totalCost;
      target.stock.price = +(Math.max(1.0, target.stock.price * 0.98)).toFixed(2); // Sell pressure
    }

    this.gameState.markFirmDirty(buyer.id);
    this.gameState.markFirmDirty(target.id);
    return { success: true, count, price: target.stock.price, totalCost };
  }

  // Hostile Takeover: Acquiring >50% voting stake in a rival
  executeHostileTakeover(acquirerFirmId, targetFirmId) {
    const acquirer = this.gameState.firms.get(acquirerFirmId);
    const target = this.gameState.firms.get(targetFirmId);
    if (!acquirer || !target || acquirerFirmId === targetFirmId) {
      return { success: false, reason: 'Invalid takeover target' };
    }

    const ownedShares = acquirer.shareHoldings[targetFirmId] || 0;
    const totalShares = target.stock.totalShares || 100000;
    const votingPercent = (ownedShares / totalShares) * 100;

    if (votingPercent <= 50) {
      return {
        success: false,
        reason: `Takeover Blocked: You control ${votingPercent.toFixed(1)}% of voting shares. A majority (>50%) is required for a Hostile Takeover!`
      };
    }

    // Absorbing all properties, buildings, and remaining cash!
    let absorbedCount = 0;
    for (let x = 0; x < this.gameState.gridSize; x++) {
      for (let y = 0; y < this.gameState.gridSize; y++) {
        const tile = this.gameState.grid[x][y];
        if (tile.ownerId === targetFirmId) {
          tile.ownerId = acquirerFirmId;
          absorbedCount++;
          this.gameState.markTileDirty(x, y);
        }
      }
    }

    acquirer.cash += Math.max(0, target.cash);
    acquirer.influencePoints += Math.round(target.influencePoints * 0.5);

    // Dissolve or subordinate the target firm
    target.cash = 0;
    target.totalLand = 0;
    target.totalBuildings = 0;
    target.totalArcologies = 0;
    target.name = `${target.name} [Subsidiary of ${acquirer.name}]`;

    this.gameState.addNews(
      `HOSTILE TAKEOVER COMPLETE: ${acquirer.name} acquired ${votingPercent.toFixed(1)}% controlling interest in ${target.name} and seized all ${absorbedCount} parcels and corporate assets!`,
      'critical'
    );

    this.gameState.markFirmDirty(acquirer.id);
    this.gameState.markFirmDirty(target.id);
    return { success: true, absorbedCount };
  }

  // Central Bank Leveraged Loan
  takeMarginLoan(firmId, borrowAmount) {
    const firm = this.gameState.firms.get(firmId);
    if (!firm || borrowAmount <= 0) return { success: false, reason: 'Invalid loan request' };

    // Max loan capacity is 70% of firm Net Worth
    const maxBorrowable = Math.max(0, Math.round(firm.netWorth * 0.70));
    const currentLoan = firm.marginLoan ? firm.marginLoan.borrowedAmount : 0;
    const available = Math.max(0, maxBorrowable - currentLoan);

    if (borrowAmount > available) {
      return {
        success: false,
        reason: `Central Bank Rejected: Max available leverage is $${available.toLocaleString()} (70% Loan-to-Value cap)`
      };
    }

    firm.cash += borrowAmount;
    if (!firm.marginLoan) firm.marginLoan = { borrowedAmount: 0, collateralShares: 0 };
    firm.marginLoan.borrowedAmount += borrowAmount;

    this.gameState.addNews(
      `CENTRAL BANK: ${firm.name} originated a $${borrowAmount.toLocaleString()} collateralized margin loan.`,
      'info'
    );

    this.gameState.markFirmDirty(firm.id);
    return { success: true, newTotalLoan: firm.marginLoan.borrowedAmount };
  }

  repayMarginLoan(firmId, repayAmount) {
    const firm = this.gameState.firms.get(firmId);
    if (!firm || repayAmount <= 0) return { success: false, reason: 'Invalid repay amount' };

    const currentLoan = firm.marginLoan ? firm.marginLoan.borrowedAmount : 0;
    if (currentLoan <= 0) return { success: false, reason: 'No outstanding margin debt to repay' };

    const actualRepay = Math.min(firm.cash, Math.min(currentLoan, repayAmount));
    if (actualRepay <= 0) return { success: false, reason: 'Insufficient liquid cash to repay loan' };

    firm.cash -= actualRepay;
    firm.marginLoan.borrowedAmount -= actualRepay;

    if (firm.marginLoan.borrowedAmount <= 0) {
      firm.marginStatus = 'HEALTHY';
      firm.marginGraceExpiry = null;
    }

    this.gameState.markFirmDirty(firm.id);
    return { success: true, repaid: actualRepay, remainingDebt: firm.marginLoan.borrowedAmount };
  }
}

module.exports = StockMarketEngine;
