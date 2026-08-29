// server/engine/MacroeconomicsEngine.js
// Macroeconomic resource markets, spot pricing algorithms, foreign NPC export controls,
// Mayoral diplomacy, and probabilistic military campaigns.

class MacroeconomicsEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update() {
    const isResourceTick = this.gameState.tick % 5 === 0;

    if (isResourceTick) {
      this.updateResourceSpotPrices();
      this.simulateGlobalGeopolitics();
    }

    // Process ongoing military campaign if active
    if (this.gameState.municipal.militaryCampaign) {
      this.processMilitaryCampaign();
    }
  }

  updateResourceSpotPrices() {
    const res = this.gameState.resources;
    const foreign = this.gameState.municipal.foreignRelations;

    // Calculate dynamic spot prices based on demand/supply ratios
    for (const key of Object.keys(res)) {
      const item = res[key];
      // Float supply and demand organically
      item.supply = Math.max(500, item.supply + (Math.random() * 200 - 90));
      item.demand = Math.max(400, item.demand + (Math.random() * 180 - 90));

      const ratio = item.demand / Math.max(1, item.supply);
      let targetPrice = 50;

      if (key === 'concrete') targetPrice = Math.round(45 * ratio);
      else if (key === 'steel') targetPrice = Math.round(120 * ratio);
      else if (key === 'timber') targetPrice = Math.round(35 * ratio);
      else if (key === 'rareEarth') {
        let base = 450 * ratio * (1 + foreign.tariffRate);
        if (foreign.embargoActive) base *= 2.6; // Severe price spike during embargo!
        targetPrice = Math.round(base);
      } else if (key === 'superconductors') {
        let base = 850 * ratio * (1 + foreign.tariffRate);
        if (foreign.embargoActive) base *= 2.4;
        targetPrice = Math.round(base);
      }

      // Smooth price change
      item.spotPrice = Math.max(10, Math.round(item.spotPrice * 0.85 + targetPrice * 0.15));
      item.history.push(item.spotPrice);
      if (item.history.length > 30) item.history.shift();
    }

    this.gameState.dirtyMarket = true;
  }

  simulateGlobalGeopolitics() {
    // 2% chance every 5 ticks of geopolitical event
    if (Math.random() < 0.02) {
      const foreign = this.gameState.municipal.foreignRelations;
      const events = [
        {
          name: 'Valorian Trade Dispute: 25% Export Tariff Levied on Rare-Earths',
          action: () => {
            foreign.tariffRate = 0.25;
            foreign.embargoActive = false;
          }
        },
        {
          name: 'Geopolitical Crisis: Total Foreign Embargo on Antigravity Electronics!',
          action: () => {
            foreign.embargoActive = true;
            foreign.tariffRate = 0.50;
          }
        },
        {
          name: 'Global Supply Surge: Foreign Superconductor Mine Expansion',
          action: () => {
            foreign.embargoActive = false;
            foreign.tariffRate = 0.05;
            this.gameState.resources.superconductors.supply += 3000;
          }
        }
      ];

      const chosen = events[Math.floor(Math.random() * events.length)];
      chosen.action();
      this.gameState.addNews(`GEOPOLITICS: ${chosen.name}`, 'warning', { foreign });
    }
  }

  // Player/Firm buys resources from exchange
  buyResource(firmId, resourceKey, amount) {
    const firm = this.gameState.firms.get(firmId);
    const item = this.gameState.resources[resourceKey];
    if (!firm || !item || amount <= 0) return { success: false, reason: 'Invalid parameters' };

    const totalCost = Math.round(item.spotPrice * amount);
    if (firm.cash < totalCost) {
      return { success: false, reason: `Insufficient cash ($${totalCost.toLocaleString()} required)` };
    }

    firm.cash -= totalCost;
    firm.inventory[resourceKey] = (firm.inventory[resourceKey] || 0) + amount;
    item.demand += amount * 0.5; // Buying increases market demand!

    this.gameState.markFirmDirty(firm.id);
    this.gameState.dirtyMarket = true;
    return { success: true, totalCost, spotPrice: item.spotPrice };
  }

  // Mayor Soft Power: Diplomatic Treaty Negotiation
  negotiateDiplomaticTreaty(mayorFirmId) {
    if (this.gameState.municipal.mayor.firmId !== mayorFirmId) {
      return { success: false, reason: 'Only the elected Mayor can lead diplomatic negotiations!' };
    }

    const cost = 250000;
    const reqIP = 40;
    const mayorFirm = this.gameState.firms.get(mayorFirmId);

    if (this.gameState.municipal.treasury < cost) {
      return { success: false, reason: `Municipal Treasury lacks $${cost.toLocaleString()} required for trade concessions.` };
    }
    if (mayorFirm && mayorFirm.influencePoints < reqIP) {
      return { success: false, reason: `Mayor lacks ${reqIP} Influence Points required for diplomatic leverage.` };
    }

    this.gameState.municipal.treasury -= cost;
    if (mayorFirm) mayorFirm.influencePoints -= reqIP;

    const foreign = this.gameState.municipal.foreignRelations;
    foreign.embargoActive = false;
    foreign.tariffRate = 0.0;
    foreign.activeTreatyUntilTick = this.gameState.tick + 600;
    foreign.relationsScore = 95;

    // Influx of rare earth supply
    this.gameState.resources.rareEarth.supply += 4000;
    this.gameState.resources.superconductors.supply += 2500;

    this.gameState.addNews(
      `DIPLOMACY: Mayor ${this.gameState.municipal.mayor.name} signed the Valorian Free Trade Accord! All tariffs and embargoes removed. Rare-earth prices stabilized.`,
      'success'
    );

    this.gameState.dirtyMarket = true;
    this.gameState.dirtyPolitics = true;
    return { success: true };
  }

  // Mayor Hard Power: Military Campaign Force Projection
  launchMilitaryCampaign(mayorFirmId) {
    if (this.gameState.municipal.mayor.firmId !== mayorFirmId) {
      return { success: false, reason: 'Only the elected Mayor can propose a military expedition!' };
    }
    if (this.gameState.municipal.militaryCampaign) {
      return { success: false, reason: 'A military campaign is already active!' };
    }

    const warBudget = 600000;
    if (this.gameState.municipal.treasury < warBudget) {
      return { success: false, reason: `Municipal Treasury lacks $${warBudget.toLocaleString()} required for military force projection.` };
    }

    // Require majority council vote (6 of 10 seats)
    let votesFor = 0;
    for (const seat of this.gameState.municipal.councilSeats) {
      if (seat.trait === 'Pro-Military' || seat.trait === 'Pro-Business' || seat.trait === 'Pro-Industrial') {
        votesFor++;
      } else if (Math.random() > 0.4) {
        votesFor++;
      }
    }

    if (votesFor < 6) {
      return {
        success: false,
        reason: `City Council VETO: Military funding proposal failed ${votesFor}-10 vote in City Council!`
      };
    }

    this.gameState.municipal.treasury -= warBudget;

    this.gameState.municipal.militaryCampaign = {
      startedTick: this.gameState.tick,
      resolvesTick: this.gameState.tick + 35, // ~18 seconds
      budget: warBudget,
      winProbability: 0.70 // 70% odds
    };

    this.gameState.addNews(
      `WAR ROOM: City Council approved $${warBudget.toLocaleString()} military deployment to enforce maritime shipping corridors! Resolution in 35 ticks.`,
      'critical',
      this.gameState.municipal.militaryCampaign
    );

    return { success: true };
  }

  processMilitaryCampaign() {
    const campaign = this.gameState.municipal.militaryCampaign;
    if (!campaign) return;

    if (this.gameState.tick >= campaign.resolvesTick) {
      const won = Math.random() < campaign.winProbability;
      const foreign = this.gameState.municipal.foreignRelations;

      if (won) {
        // Massive victory
        foreign.embargoActive = false;
        foreign.tariffRate = 0.0;
        this.gameState.resources.rareEarth.supply += 8000;
        this.gameState.resources.superconductors.supply += 5000;
        this.gameState.resources.steel.supply += 10000;

        this.gameState.addNews(
          `MILITARY VICTORY: Security expedition secured foreign maritime trade routes! Favorable trade treaty enforced, flood of cheap rare-earths and superconductors secured.`,
          'success'
        );
      } else {
        // Catastrophic defeat
        foreign.embargoActive = true;
        foreign.tariffRate = 0.75;
        this.gameState.resources.rareEarth.supply = Math.max(200, this.gameState.resources.rareEarth.supply - 1500);

        this.gameState.addNews(
          `MILITARY DEFEAT: Overseas campaign collapsed! $600,000 municipal capital destroyed, foreign nation declared punitive 75% sanctions and total embargo.`,
          'critical'
        );
      }

      this.gameState.municipal.militaryCampaign = null;
      this.gameState.dirtyMarket = true;
      this.gameState.dirtyPolitics = true;
    }
  }
}

module.exports = MacroeconomicsEngine;
