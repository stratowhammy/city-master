// server/engine/PoliticsEngine.js
// Municipal Governance, Philadelphia-style Councilmanic Prerogative,
// Zoning Board of Adjustment (ZBA), Trade Unions, Tax Abatements, Legislative Bills & Policy Lobbying.

const POLICY_DEFINITIONS = [
  {
    id: 'POLICY_COMMERCIAL_BOOM',
    name: 'Commercial Boom Act',
    icon: '🏪',
    description: '+30% Commercial rental income city-wide and +15% commercial land value bonus.',
    perks: { commercialRentBonus: 0.30, commercialLandValueBonus: 0.15 },
    baseSupport: 44,
    durationTicks: 600
  },
  {
    id: 'POLICY_INDUSTRIAL_DEREG',
    name: 'Industrial Deregulation & Freight Subsidy',
    icon: '🏭',
    description: '+35% Factory production rent and 20% lower pollution spread to adjacent neighborhoods.',
    perks: { industrialRentBonus: 0.35, pollutionDamping: 0.20 },
    baseSupport: 38,
    durationTicks: 600
  },
  {
    id: 'POLICY_RESIDENTIAL_SUBSIDY',
    name: 'Residential Homestead & Tenant Subsidy',
    icon: '🏡',
    description: '+25% Residential rent income and +20 family happiness/desirability across all districts.',
    perks: { residentialRentBonus: 0.25, tenantHappinessBonus: 20 },
    baseSupport: 48,
    durationTicks: 600
  },
  {
    id: 'POLICY_TAX_HOLIDAY',
    name: 'Municipal 10-Year Tax Holiday',
    icon: '📜',
    description: 'Cuts municipal property tax rate in half (down to 2.25%) for all registered builders.',
    perks: { propertyTaxDiscount: 0.50 },
    baseSupport: 35,
    durationTicks: 1200
  },
  {
    id: 'POLICY_MARITIME_CORRIDOR',
    name: 'Maritime Trade Corridor Act',
    icon: '🚢',
    description: 'All 3 Maritime Ports provide +50% trade throughput and rent bonus within 8 tiles.',
    perks: { maritimePortBonus: 0.50 },
    baseSupport: 52,
    durationTicks: 600
  },
  {
    id: 'POLICY_BOULEVARD_MODERN',
    name: 'Boulevard & Infrastructure Modernization',
    icon: '🚧',
    description: '+20% land value along multi-lane avenues and boulevards with zero road maintenance fee.',
    perks: { avenueLandValueBonus: 0.20, roadMaintenanceFee: 0 },
    baseSupport: 46,
    durationTicks: 600
  }
];

class PoliticsEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  getPolicyDefinitions() {
    return POLICY_DEFINITIONS;
  }

  update() {
    const isElectionTick = this.gameState.tick >= this.gameState.municipal.nextElectionTick;

    if (isElectionTick) {
      this.runElections();
    }

    // Process pending ZBA applications
    this.processZBAQueue();

    // Process Active Legislative Bill Vote Countdown & Stochastic Uncertainty Resolution
    this.processActiveBillVote();

    // Clean up expired active policies
    this.processActivePolicies();

    // Bribery audit risk decay: 1% decrease for every 10,000 ticks (0.0001% per tick)
    this.decayBriberyRisk();

    // Check random wildcat strikes on non-union buildings
    if (this.gameState.tick % 30 === 0) {
      this.checkUnionStrikes();
    }
  }

  decayBriberyRisk() {
    const decayAmount = 1 / 10000; // 1% per 10,000 ticks
    for (const firm of this.gameState.firms.values()) {
      if (firm.bribeAuditRisk && firm.bribeAuditRisk > 0) {
        firm.bribeAuditRisk = Math.max(0, +(firm.bribeAuditRisk - decayAmount).toFixed(6));
      }
    }
  }

  processActiveBillVote() {
    const bill = this.gameState.municipal.activeBill;
    if (!bill || bill.status !== 'IN_SESSION') return;

    if (this.gameState.tick >= bill.voteCastTick) {
      // Uncertainty: ±10% stochastic deviation (-10.0% to +10.0%)
      const deviation = (Math.random() * 20.0) - 10.0;
      const finalVotePercent = Math.max(0, Math.min(100, Math.round(bill.projectedVote + deviation)));
      const passed = finalVotePercent >= 50;

      bill.finalVotePercent = finalVotePercent;
      bill.deviation = +deviation.toFixed(1);
      bill.status = passed ? 'PASSED' : 'FAILED';

      const proposerFirm = this.gameState.firms.get(bill.proposerFirmId);

      if (passed) {
        this.gameState.municipal.activePolicies.push({
          id: bill.policyId,
          name: bill.name,
          icon: bill.icon,
          description: bill.description,
          perks: bill.perks,
          enactedTick: this.gameState.tick,
          expiresTick: this.gameState.tick + bill.durationTicks
        });

        if (proposerFirm) {
          proposerFirm.influencePoints += 25;
          this.gameState.markFirmDirty(proposerFirm.id);
        }

        this.gameState.addNews(
          `🎉 BILL PASSED (${finalVotePercent}% YES): City Council enacted "${bill.name}"! (${deviation >= 0 ? '+' : ''}${bill.deviation}% vote swing). Policy perks active for ${bill.durationTicks} ticks.`,
          'success',
          bill
        );
      } else {
        this.gameState.addNews(
          `❌ BILL DEFEATED (${finalVotePercent}% YES): City Council rejected "${bill.name}"! (${deviation >= 0 ? '+' : ''}${bill.deviation}% vote swing). Required 50% to pass.`,
          'warning',
          bill
        );
      }

      this.gameState.municipal.activeBill = null;
    }
  }

  processActivePolicies() {
    const policies = this.gameState.municipal.activePolicies;
    if (!policies || policies.length === 0) return;

    for (let i = policies.length - 1; i >= 0; i--) {
      const p = policies[i];
      if (this.gameState.tick >= p.expiresTick) {
        policies.splice(i, 1);
        this.gameState.addNews(
          `POLICY EXPIRED: Legislative term for "${p.name}" has concluded. Perks reverted to standard law.`,
          'politics'
        );
      }
    }
  }

  proposeBill(firmId, policyId) {
    const firm = this.gameState.firms.get(firmId);
    if (!firm) return { success: false, reason: 'Invalid firm' };

    if (this.gameState.municipal.activeBill) {
      return { success: false, reason: 'A legislative bill is already on the council floor for voting!' };
    }

    const def = POLICY_DEFINITIONS.find(p => p.id === policyId);
    if (!def) return { success: false, reason: 'Unknown policy bill' };

    const bill = {
      policyId: def.id,
      name: def.name,
      icon: def.icon,
      description: def.description,
      perks: def.perks,
      durationTicks: def.durationTicks,
      proposerFirmId: firm.id,
      proposerName: firm.name,
      baseSupport: def.baseSupport,
      rpSpent: 0,
      swayBonus: 0,
      bribesOffered: 0,
      bribeBonus: 0,
      projectedVote: def.baseSupport,
      startedTick: this.gameState.tick,
      voteCastTick: this.gameState.tick + 60,
      status: 'IN_SESSION'
    };

    this.gameState.municipal.activeBill = bill;
    this.gameState.addNews(
      `🏛️ BILL INTRODUCED: ${firm.name} submitted "${bill.name}" to City Hall! Council floor vote in 60 ticks.`,
      'politics',
      bill
    );
    this.gameState.markFirmDirty(firm.id);
    return { success: true, bill };
  }

  lobbyBill(firmId, rpAmount) {
    const firm = this.gameState.firms.get(firmId);
    const bill = this.gameState.municipal.activeBill;
    if (!firm) return { success: false, reason: 'Invalid firm' };
    if (!bill || bill.status !== 'IN_SESSION') {
      return { success: false, reason: 'No active legislative bill currently on the floor to lobby!' };
    }

    const rp = parseInt(rpAmount, 10);
    if (isNaN(rp) || rp <= 0) {
      return { success: false, reason: 'Please specify a valid positive integer of Respect Points to lobby!' };
    }

    if (firm.influencePoints < rp) {
      return { success: false, reason: `Not enough Respect Points! You have ${firm.influencePoints} RP.` };
    }

    firm.influencePoints -= rp;
    bill.rpSpent += rp;
    bill.swayBonus = Math.min(50, (bill.rpSpent / 5) * 2.5);
    bill.projectedVote = Math.min(95, Math.max(5, Math.round(bill.baseSupport + bill.swayBonus + bill.bribeBonus)));

    this.gameState.markFirmDirty(firm.id);
    this.gameState.addNews(
      `🏛️ LOBBYING: ${firm.name} spent ${rp} Respect Points lobbying councilmembers on "${bill.name}" (Projected Support: ${bill.projectedVote}%).`,
      'politics'
    );

    return { success: true, projectedVote: bill.projectedVote, rpRemaining: firm.influencePoints };
  }

  bribeOfficial(firmId) {
    const firm = this.gameState.firms.get(firmId);
    const bill = this.gameState.municipal.activeBill;
    if (!firm) return { success: false, reason: 'Invalid firm' };
    if (!bill || bill.status !== 'IN_SESSION') {
      return { success: false, reason: 'No active legislative bill currently on the floor!' };
    }

    const bribeCost = 25000;
    if (firm.cash < bribeCost) {
      return { success: false, reason: `Not enough cash! A political bribe requires $${bribeCost.toLocaleString()}.` };
    }

    firm.cash -= bribeCost;
    bill.bribesOffered += 1;
    bill.bribeBonus += 12;
    bill.projectedVote = Math.min(98, Math.max(5, Math.round(bill.baseSupport + bill.swayBonus + bill.bribeBonus)));

    // Every bribe increases chances of being caught by 5%
    firm.bribeAuditRisk = Math.min(100, (firm.bribeAuditRisk || 0) + 5);

    // Roll for ethics investigation
    const caught = Math.random() * 100 < firm.bribeAuditRisk;

    if (caught) {
      const fine = Math.round(Math.min(firm.cash, 50000));
      firm.cash -= fine;
      firm.influencePoints = Math.max(0, firm.influencePoints - 30);
      bill.bribeBonus = Math.max(0, bill.bribeBonus - 12);
      bill.projectedVote = Math.min(95, Math.max(5, Math.round(bill.baseSupport + bill.swayBonus + bill.bribeBonus)));

      this.gameState.addNews(
        `🚨 CORRUPTION BUST: Ethics Committee caught ${firm.name} offering bribes to sway "${bill.name}"! Fined $${fine.toLocaleString()} and lost 30 Respect Points. Current investigation risk: ${firm.bribeAuditRisk.toFixed(1)}%.`,
        'warning'
      );
      this.gameState.markFirmDirty(firm.id);
      return {
        success: true,
        caught: true,
        fine,
        risk: firm.bribeAuditRisk,
        projectedVote: bill.projectedVote,
        message: `🚨 BUSTED BY ETHICS COMMITTEE! You were caught offering a bribe. Fined $${fine.toLocaleString()} and lost 30 Respect Points!`
      };
    } else {
      this.gameState.addNews(
        `🤫 BACKROOM DEAL: An anonymous donor secured key political backing for "${bill.name}"! (+12% projected vote sway, Investigation Risk: ${firm.bribeAuditRisk.toFixed(1)}%).`,
        'politics'
      );
      this.gameState.markFirmDirty(firm.id);
      return {
        success: true,
        caught: false,
        risk: firm.bribeAuditRisk,
        projectedVote: bill.projectedVote,
        message: `💰 Secret bribe delivered successfully! +12% vote sway secured. Current investigation risk is ${firm.bribeAuditRisk.toFixed(1)}%.`
      };
    }
  }

  lobbyCouncilVeto(firmId, districtId) {
    const firm = this.gameState.firms.get(firmId);
    if (!firm) return { success: false, reason: 'Invalid firm' };
    if (firm.influencePoints < 50) {
      return { success: false, reason: 'Lobbying a Councilmanic Veto requires 50 Respect Points!' };
    }

    firm.influencePoints -= 50;
    this.gameState.addNews(
      `🏛️ COUNCIL LOBBYING: ${firm.name} spent 50 Respect Points to successfully lobby District ${districtId} council leadership!`,
      'politics'
    );
    this.gameState.markFirmDirty(firm.id);
    return { success: true };
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
