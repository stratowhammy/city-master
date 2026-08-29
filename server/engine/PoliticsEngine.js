// server/engine/PoliticsEngine.js
// Municipal Governance, Philadelphia-style Councilmanic Prerogative,
// Zoning Board of Adjustment (ZBA), Trade Unions, Tax Abatements, and Elections.

class PoliticsEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update() {
    const isElectionTick = this.gameState.tick >= this.gameState.municipal.nextElectionTick;

    if (isElectionTick) {
      this.runElections();
    }

    // Process pending ZBA applications
    this.processZBAQueue();

    // Check random wildcat strikes on non-union buildings
    if (this.gameState.tick % 30 === 0) {
      this.checkUnionStrikes();
    }
  }

  // Check if a build/variance requires Councilmanic Prerogative approval
  checkCouncilmanicPrerogative(districtId, firmId, buildingType, level, isVariance) {
    const seat = this.gameState.municipal.councilSeats.find(s => s.districtId === districtId);
    if (!seat) return { allowed: true };

    // If the player owns the seat, they instantly approve their own permits!
    if (seat.holderFirmId === firmId) {
      return { allowed: true, reason: 'Councilmanic Prerogative: You hold the seat in this district and self-approved the permit!' };
    }

    // Level 4 Arcologies, Level 3 High-density, Industrial, or Variances trigger Councilmanic Prerogative
    if (level >= 3 || buildingType === 'INDUSTRIAL' || level === 4 || isVariance) {
      const councilmember = seat;
      // Pro-Union vetoes non-union arcologies; Environmentalist vetoes industrial; NIMBY vetoes high density
      if (councilmember.trait === 'Radical Environmentalist' && (buildingType === 'INDUSTRIAL' || level >= 3)) {
        return {
          allowed: false,
          vetoedBy: councilmember.holderName,
          reason: `VETO: Councilmember ${councilmember.holderName} exercised Councilmanic Prerogative against high-impact construction in District ${districtId}! (Override requires 50 Influence Points)`
        };
      }

      if (councilmember.trait === 'NIMBY Conservative' && level >= 3) {
        return {
          allowed: false,
          vetoedBy: councilmember.holderName,
          reason: `VETO: Councilmember ${councilmember.holderName} invoked Councilmanic Prerogative to protect neighborhood scale! (Override requires 40 Influence Points)`
        };
      }

      if (councilmember.trait === 'Antigravity Speculator' && level === 4) {
        return { allowed: true, reason: 'Councilmember enthusiastic about Antigravity high-tech development!' };
      }
    }

    return { allowed: true };
  }

  // Submit a Zoning Board of Adjustment (ZBA) variance
  submitZBAVariance(firmId, x, y, requestedZoning, proposedLevel) {
    const tile = this.gameState.grid[x][y];
    const firm = this.gameState.firms.get(firmId);
    const district = this.gameState.districts.find(d => d.id === tile.districtId);

    const varianceApp = {
      id: `zba_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      firmId,
      firmName: firm ? firm.name : 'Unknown Firm',
      districtId: tile.districtId,
      districtName: district ? district.name : `District ${tile.districtId}`,
      x,
      y,
      baseZoning: tile.zoning,
      requestedZoning,
      proposedLevel,
      submittedTick: this.gameState.tick,
      resolveTick: this.gameState.tick + 20, // 20 ticks (~10s review)
      status: 'PENDING',
      votesYes: 0,
      votesNo: 0,
      influenceBonus: 0
    };

    this.gameState.municipal.pendingVariances.push(varianceApp);
    this.gameState.addNews(
      `ZBA: ${varianceApp.firmName} filed for a zoning variance in ${varianceApp.districtName} for ${requestedZoning} Level ${proposedLevel}.`,
      'politics',
      varianceApp
    );
    return varianceApp;
  }

  processZBAQueue() {
    const queue = this.gameState.municipal.pendingVariances;
    for (let i = queue.length - 1; i >= 0; i--) {
      const app = queue[i];
      if (this.gameState.tick >= app.resolveTick && app.status === 'PENDING') {
        // Evaluate votes from 5 ZBA members
        let yes = 0;
        let no = 0;
        const members = this.gameState.municipal.zbaMembers;

        for (const m of members) {
          let memberVote = Math.random() > 0.4; // Base 60% approval chance
          if (m.lean === 'Environmentalist' && app.requestedZoning === 'INDUSTRIAL') memberVote = false;
          if (m.lean === 'Pro-Labor' && app.proposedLevel >= 3) memberVote = true;
          if (m.lean === 'Antigravity Innovation' && app.proposedLevel === 4) memberVote = true;
          if (app.influenceBonus > 0 && Math.random() < (app.influenceBonus / 50)) memberVote = true;

          if (memberVote) yes++; else no++;
        }

        app.votesYes = yes;
        app.votesNo = no;
        app.status = (yes >= 3) ? 'APPROVED' : 'DENIED';

        const firm = this.gameState.firms.get(app.firmId);
        if (app.status === 'APPROVED') {
          const tile = this.gameState.grid[app.x][app.y];
          tile.zoning = app.requestedZoning;
          this.gameState.markTileDirty(app.x, app.y);
          this.gameState.addNews(
            `ZBA APPROVED: Variance granted to ${app.firmName} in District ${app.districtId} (${yes}-${no} vote).`,
            'success',
            app
          );
        } else {
          this.gameState.addNews(
            `ZBA DENIED: Variance rejected for ${app.firmName} in District ${app.districtId} (${yes}-${no} vote).`,
            'warning',
            app
          );
        }
      }
    }
  }

  // Property Tax Abatements (10-Year 100% Tax Exemption on structural improvements)
  grantTaxAbatement(firmId, x, y, isUnionPledged) {
    const firm = this.gameState.firms.get(firmId);
    const tile = this.gameState.grid[x][y];
    if (!firm || !tile) return { success: false, reason: 'Invalid target' };

    if (!isUnionPledged && firm.unionLoyalty < 60) {
      return {
        success: false,
        reason: 'DENIED: The City Council requires a binding Union Labor agreement to qualify for a 10-Year Tax Abatement!'
      };
    }

    const durationTicks = 1200; // 10 simulated years
    if (tile.groundBuilding) {
      tile.groundBuilding.taxAbatedUntil = this.gameState.tick + durationTicks;
    }
    if (tile.floatingBuilding) {
      tile.floatingBuilding.taxAbatedUntil = this.gameState.tick + durationTicks;
    }

    firm.taxAbatementsActive = (firm.taxAbatementsActive || 0) + 1;
    firm.unionLoyalty = Math.min(100, firm.unionLoyalty + 10);
    firm.influencePoints += 15;

    this.gameState.markTileDirty(x, y);
    this.gameState.markFirmDirty(firm.id);

    this.gameState.addNews(
      `TAX ABATEMENT: ${firm.name} secured a 10-Year Property Tax Abatement at (${x}, ${y}) under Ordinance 961!`,
      'success'
    );

    return { success: true, abatedUntilTick: this.gameState.tick + durationTicks };
  }

  checkUnionStrikes() {
    for (let x = 0; x < this.gameState.gridSize; x++) {
      for (let y = 0; y < this.gameState.gridSize; y++) {
        const tile = this.gameState.grid[x][y];
        if (tile.groundBuilding && !tile.groundBuilding.unionBuilt) {
          // 8% chance of wildcat strike on non-union sites
          if (Math.random() < 0.08 && !tile.groundBuilding.isUnderStrike) {
            tile.groundBuilding.isUnderStrike = true;
            tile.groundBuilding.strikeEndsTick = this.gameState.tick + 40;
            const firm = this.gameState.firms.get(tile.ownerId);
            if (firm && firm.isHuman) {
              this.gameState.addNews(
                `UNION STRIKE: Non-union site "${tile.groundBuilding.name}" in District ${tile.districtId} hit by wildcat strike! Construction halted and revenue frozen.`,
                'warning',
                { x, y }
              );
            }
            this.gameState.markTileDirty(x, y);
          }
        }

        if (tile.groundBuilding && tile.groundBuilding.isUnderStrike && this.gameState.tick >= tile.groundBuilding.strikeEndsTick) {
          tile.groundBuilding.isUnderStrike = false;
          this.gameState.markTileDirty(x, y);
        }
      }
    }
  }

  runElections() {
    this.gameState.municipal.nextElectionTick = this.gameState.tick + this.gameState.municipal.electionCycleTicks;
    this.gameState.addNews(`MUNICIPAL ELECTIONS: City-wide voting underway for 10 Council Districts and Mayor!`, 'politics');

    // Run Council elections
    for (const seat of this.gameState.municipal.councilSeats) {
      // Find eligible candidates in this district (firms with land/influence)
      const districtFirms = [];
      for (const [id, firm] of this.gameState.firms.entries()) {
        if (firm.influencePoints > 20) {
          districtFirms.push({ firm, score: firm.influencePoints + Math.random() * 50 });
        }
      }
      districtFirms.sort((a, b) => b.score - a.score);

      if (districtFirms.length > 0) {
        const winner = districtFirms[0].firm;
        seat.holderFirmId = winner.id;
        seat.holderName = winner.name;
        seat.isNPC = !winner.isHuman;
        winner.politicalSeat = `COUNCIL_D${seat.districtId}`;
      }
    }

    // Run Mayor election
    let topMayorCandidate = null;
    let maxMayorScore = -1;
    for (const [id, firm] of this.gameState.firms.entries()) {
      const score = (firm.influencePoints * 2) + (firm.netWorth / 10000) + Math.random() * 80;
      if (score > maxMayorScore) {
        maxMayorScore = score;
        topMayorCandidate = firm;
      }
    }

    if (topMayorCandidate) {
      this.gameState.municipal.mayor.firmId = topMayorCandidate.id;
      this.gameState.municipal.mayor.name = topMayorCandidate.name;
      this.gameState.municipal.mayor.isNPC = !topMayorCandidate.isHuman;
      topMayorCandidate.politicalSeat = 'MAYOR';
      this.gameState.addNews(
        `ELECTION RESULTS: ${topMayorCandidate.name} elected Mayor of the City! Full executive powers granted.`,
        'success',
        { mayorId: topMayorCandidate.id }
      );
    }
  }

  // Mayor Action: Set tax rates
  setTaxRates(firmId, propertyTaxRate, wageTaxRate) {
    if (this.gameState.municipal.mayor.firmId !== firmId) {
      return { success: false, reason: 'Only the elected Mayor can adjust city-wide tax rates!' };
    }
    this.gameState.municipal.propertyTaxRate = Math.max(0.01, Math.min(0.15, propertyTaxRate));
    this.gameState.municipal.wageTaxRate = Math.max(0.01, Math.min(0.10, wageTaxRate));
    this.gameState.addNews(
      `MAYOR EXECUTIVE ORDER: Property tax set to ${(this.gameState.municipal.propertyTaxRate * 100).toFixed(1)}%, Wage tax to ${(this.gameState.municipal.wageTaxRate * 100).toFixed(1)}%.`,
      'politics'
    );
    return { success: true };
  }

  // Influence Point: Trigger municipal corruption investigation into rival
  triggerAudit(initiatorFirmId, targetFirmId) {
    const initiator = this.gameState.firms.get(initiatorFirmId);
    const target = this.gameState.firms.get(targetFirmId);
    if (!initiator || !target) return { success: false, reason: 'Invalid firm' };
    if (initiator.influencePoints < 40) return { success: false, reason: 'Requires 40 Influence Points' };

    initiator.influencePoints -= 40;
    const auditFine = Math.round(target.cash * 0.15 + 15000);
    target.cash -= auditFine;
    target.influencePoints = Math.max(0, target.influencePoints - 20);
    target.stock.price = Math.max(1.0, target.stock.price * 0.85);

    this.gameState.markFirmDirty(initiator.id);
    this.gameState.markFirmDirty(target.id);

    this.gameState.addNews(
      `CORRUPTION PROBE: Municipal ethics investigation launched into ${target.name}! Fined $${auditFine.toLocaleString()} and stock penalized.`,
      'warning'
    );
    return { success: true, auditFine };
  }
}

module.exports = PoliticsEngine;
