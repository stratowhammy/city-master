// server/engine/CellularAutomata.js
// Spatial synergy engine, cellular automata AoE calculations,
// pollution depression, crime, transit demand, and indirect PvP combat.

class CellularAutomata {
  constructor(gameState) {
    this.gameState = gameState;
  }

  update() {
    const size = this.gameState.gridSize;
    const pollutionMap = Array.from({ length: size }, () => new Float32Array(size));
    const crimeMap = Array.from({ length: size }, () => new Float32Array(size));
    const laborMap = Array.from({ length: size }, () => new Float32Array(size));
    const civicBuffMap = Array.from({ length: size }, () => new Float32Array(size));

    // 1. Gather emitters
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const tile = this.gameState.grid[x][y];
        if (tile.isWater) continue;

        // Ground building emissions
        if (tile.groundBuilding) {
          const b = tile.groundBuilding;
          if (b.type === 'INDUSTRIAL') {
            const rad = b.level * 3 + 2; // Radius 5..11
            const strength = b.level * 18;
            this.applyAoE(pollutionMap, x, y, rad, strength);
          } else if (b.type === 'COMMERCIAL') {
            const rad = 4;
            const strength = b.level * 8;
            this.applyAoE(crimeMap, x, y, rad, strength);
          } else if (b.type === 'RESIDENTIAL') {
            const rad = 5;
            const strength = b.level * 10;
            this.applyAoE(laborMap, x, y, rad, strength);
          } else if (b.type === 'CIVIC' || b.type === 'PARK') {
            const rad = 6;
            this.applyAoE(civicBuffMap, x, y, rad, 25);
          }
        }

        // Floating Arcology: Clean energy, immune to ground pollution
        if (tile.floatingBuilding) {
          const fb = tile.floatingBuilding;
          const rad = 8;
          this.applyAoE(laborMap, x, y, rad, 30);
          this.applyAoE(civicBuffMap, x, y, rad, 15);
        }
      }
    }

    // 2. Apply combined effects to tiles & calculate revenues / land values
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const tile = this.gameState.grid[x][y];
        if (tile.isWater) continue;

        const rawPollution = Math.min(100, Math.max(0, pollutionMap[x][y] - (civicBuffMap[x][y] * 0.4)));
        const rawCrime = Math.min(100, Math.max(0, crimeMap[x][y] - (civicBuffMap[x][y] * 0.6)));
        const nearbyLabor = laborMap[x][y];

        tile.pollution = Math.round(rawPollution);
        tile.crime = Math.round(rawCrime);

        const district = this.gameState.districts.find(d => d.id === tile.districtId);
        const distMod = district ? district.landValueMod : 1.0;

        // Desirability calculation
        let desirability = 50 + (civicBuffMap[x][y] * 0.5) - (rawPollution * 0.6) - (rawCrime * 0.4);
        tile.desirability = Math.max(5, Math.min(100, Math.round(desirability)));

        // Land value calculation
        tile.landValue = Math.round(tile.basePrice * (tile.desirability / 50) * distMod);

        // Ground building simulation
        if (tile.groundBuilding) {
          const gb = tile.groundBuilding;
          if (gb.type === 'RESIDENTIAL') {
            // Ground residential is severely hurt by industrial pollution (Indirect PvP)
            if (tile.pollution > 40) {
              gb.rentIncome = Math.max(5, Math.round((gb.level * 80) * ((100 - tile.pollution) / 100)));
              gb.health = Math.max(20, gb.health - 0.2); // Tenant decay
            } else {
              gb.rentIncome = Math.round(gb.level * 85 * (tile.desirability / 50));
              gb.health = Math.min(100, gb.health + 0.1);
            }
          } else if (gb.type === 'COMMERCIAL') {
            // Commercial needs labor
            const laborFactor = Math.min(1.5, Math.max(0.4, nearbyLabor / 30));
            gb.rentIncome = Math.round(gb.level * 110 * laborFactor * (tile.desirability / 50));
          } else if (gb.type === 'INDUSTRIAL') {
            gb.rentIncome = Math.round(gb.level * 140);
          }
        }

        // Floating Arcology simulation (Escapes ground pollution!)
        if (tile.floatingBuilding) {
          const fb = tile.floatingBuilding;
          // Immune to ground pollution! Always enjoys pure high elevation rent
          fb.rentIncome = Math.round(fb.level * 380 * (fb.stability / 100));
        }
      }
    }
  }

  applyAoE(grid, cx, cy, radius, strength) {
    const r2 = radius * radius;
    const minX = Math.max(0, cx - radius);
    const maxX = Math.min(this.gameState.gridSize - 1, cx + radius);
    const minY = Math.max(0, cy - radius);
    const maxY = Math.min(this.gameState.gridSize - 1, cy + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dist2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (dist2 <= r2) {
          const falloff = 1 - Math.sqrt(dist2) / radius;
          grid[x][y] += strength * falloff;
        }
      }
    }
  }
}

module.exports = CellularAutomata;
