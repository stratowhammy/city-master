// server/engine/AntigravityEngine.js
// Manages simulated antigravity physics, sinusoidal hovering, Z-axis offsets,
// rare-earth maintenance consumption, crash dynamics, and flying transit networks.

class AntigravityEngine {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update(now, deltaMs) {
    const timeSec = now / 1000;
    const isMaintenanceTick = this.gameState.tick % 10 === 0; // Every 10 ticks (~5s)

    for (let x = 0; x < this.gameState.gridSize; x++) {
      for (let y = 0; y < this.gameState.gridSize; y++) {
        const tile = this.gameState.grid[x][y];
        const floating = tile.floatingBuilding;
        if (!floating) continue;

        const firm = this.gameState.firms.get(tile.ownerId);

        // 1. Catastrophic Decay and Crash Mechanics Check
        if (floating.stability <= 0) {
          // Rapid plunge
          floating.target_z = 0;
          if (floating.current_z === undefined) floating.current_z = floating.z_offset || 64;
          floating.current_z -= 16;

          if (floating.current_z <= 2) {
            // Impact crash!
            this.handleCrash(x, y, tile, floating, firm);
          } else {
            this.gameState.markTileDirty(x, y);
          }
          continue;
        }

        // 2. Resource Maintenance & Stability Check
        if (isMaintenanceTick && firm) {
          const reqRareEarth = floating.rareEarthRate || 1;
          const reqSuperconductors = floating.superconductorRate || 1;
          const maintenanceCost = floating.maintenanceCash || 250;

          const hasRareEarth = (firm.inventory.rareEarth >= reqRareEarth);
          const hasSuperconductors = (firm.inventory.superconductors >= reqSuperconductors);
          const hasCash = (firm.cash >= maintenanceCost);

          if (hasRareEarth && hasSuperconductors && hasCash) {
            // Deduct resources
            firm.inventory.rareEarth -= reqRareEarth;
            firm.inventory.superconductors -= reqSuperconductors;
            firm.cash -= maintenanceCost;
            floating.stability = Math.min(100, floating.stability + 5);
            floating.target_z = 64; // Stable cruise elevation
          } else {
            // Resource starvation! Stability decays
            floating.stability = Math.max(0, floating.stability - 25);
            floating.target_z = Math.max(0, (floating.stability / 100) * 64);

            if (firm.isHuman) {
              this.gameState.addNews(
                `CRITICAL: ${floating.name} in District ${tile.districtId} is starving for Rare-Earths/Superconductors! Stability: ${floating.stability}%`,
                'warning',
                { x, y, stability: floating.stability }
              );
            }
          }
          this.gameState.markFirmDirty(firm.id);
        }

        // 3. Sinusoidal Hovering Animation
        // z_offset = base_z + sin(time * speed + phase) * amplitude
        const phase = (x * 7 + y * 13) % 10;
        const bob = Math.sin(timeSec * 2.5 + phase) * 4.0;
        floating.current_z = Math.max(0, floating.target_z + bob);
      }
    }
  }

  handleCrash(x, y, tile, floating, firm) {
    const groundDemolished = !!tile.groundBuilding;
    const groundName = tile.groundBuilding ? tile.groundBuilding.name : 'empty land';
    const penalty = 75000 + Math.round(tile.landValue * 0.5);

    // Destroy floating structure and ground structure beneath it
    tile.floatingBuilding = null;
    tile.groundBuilding = {
      type: 'RUINS',
      level: 0,
      name: 'Catastrophic Arcology Crash Debris',
      constructedTick: this.gameState.tick,
      health: 0,
      taxAbatedUntil: 0,
      unionBuilt: false,
      rentIncome: 0,
      pollution: 40,
      crime: 20,
      population: 0,
      workers: 0
    };
    tile.pollution = Math.min(100, tile.pollution + 60);

    if (firm) {
      firm.cash -= penalty;
      firm.influencePoints = Math.max(0, firm.influencePoints - 25);
      firm.totalArcologies = Math.max(0, firm.totalArcologies - 1);
      this.gameState.markFirmDirty(firm.id);
    }

    this.gameState.markTileDirty(x, y);

    const headline = `DISASTER: Level 4 Arcology "${floating.name}" suffered antigravity collapse and crashed at (${x}, ${y})! Obliterated ${groundName}. Firm fined $${penalty.toLocaleString()}.`;
    this.gameState.addNews(headline, 'critical', { x, y, crash: true });
  }

  // Pythagorean Euclidean distance for flying transit
  calculateFlyingTransitDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Standard Manhattan distance for ground vehicles
  calculateGroundTransitDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }
}

module.exports = AntigravityEngine;
