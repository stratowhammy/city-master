// server/engine/CellularAutomata.js
// Spatial synergy engine, cellular automata AoE calculations,
// High-capacity road traffic commercial boosts, residential traffic noise penalties,
// maritime port throughput multipliers, and indirect PvP dynamics.

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
    const roadCommercialSynergyMap = Array.from({ length: size }, () => new Float32Array(size));
    const roadTrafficNoiseMap = Array.from({ length: size }, () => new Float32Array(size));
    const portThroughputMap = Array.from({ length: size }, () => new Float32Array(size));

    // 1. Gather emitters (Buildings, High-Density Roads, Maritime Ports)
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const tile = this.gameState.grid[x][y];
        if (tile.isWater) continue;

        // A. High-Density Road Traffic Emitters (Avenues, Boulevards, Arterials)
        if (tile.roadLevel >= 2) {
          const rLvl = tile.roadLevel;
          // Commercial & Industrial AoE Traffic Boost (Radius 2 to 3)
          const synergyRadius = rLvl >= 3 ? 3 : 2;
          const synergyBoost = rLvl === 2 ? 0.18 : (rLvl === 3 ? 0.30 : 0.45); // +18% to +45%
          this.applyAoE(roadCommercialSynergyMap, x, y, synergyRadius, synergyBoost * 100);

          // Residential Noise & Vehicle Exhaust Penalty (Radius 1 to 2)
          const noiseRadius = rLvl >= 3 ? 2 : 1;
          const noisePenalty = rLvl === 2 ? 10 : (rLvl === 3 ? 20 : 32); // -10 to -32 desirability
          this.applyAoE(roadTrafficNoiseMap, x, y, noiseRadius, noisePenalty);
        }

        // B. Ground building emissions
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
          } else if (b.type === 'PORT') {
            // Maritime Port throughput bonus (Radius 6)
            this.applyAoE(portThroughputMap, x, y, 6, 35);
            this.applyAoE(pollutionMap, x, y, 4, 12);
          }
        }

        // C. Floating Arcology (if active)
        if (this.gameState.ENABLE_SKY_CITIES && tile.floatingBuilding) {
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
        const roadCommSynergy = roadCommercialSynergyMap[x][y] / 100; // Float multiplier (e.g. 0.25)
        const trafficNoise = roadTrafficNoiseMap[x][y]; // Noise penalty (e.g. 15)
        const portBonus = portThroughputMap[x][y] / 100; // Port trade bonus (e.g. 0.35)

        tile.pollution = Math.round(rawPollution);
        tile.crime = Math.round(rawCrime);
        tile.roadSynergyBonus = Math.round(roadCommSynergy * 100);
        tile.trafficNoisePenalty = Math.round(trafficNoise);

        const district = this.gameState.districts.find(d => d.id === tile.districtId);
        const distMod = district ? district.landValueMod : 1.0;

        // Desirability calculation:
        // - Base: 50
        // - Civic parks: +
        // - Road commercial synergy: +
        // - Industrial pollution: -
        // - Crime: -
        // - Traffic noise (hurts residential, neutral/helpful to commercial): -
        let desirability = 50 + (civicBuffMap[x][y] * 0.5) - (rawPollution * 0.6) - (rawCrime * 0.4);

        if (tile.zoning === 'RESIDENTIAL' || (tile.groundBuilding && tile.groundBuilding.type === 'RESIDENTIAL')) {
          // Traffic noise & vehicle exhaust directly depresses residential desirability
          desirability -= trafficNoise * 0.75;
        } else if (tile.zoning === 'COMMERCIAL' || (tile.groundBuilding && tile.groundBuilding.type === 'COMMERCIAL')) {
          // Commercial loves high traffic access
          desirability += roadCommSynergy * 25 + portBonus * 20;
        }

        tile.desirability = Math.max(5, Math.min(100, Math.round(desirability)));

        // Land value calculation
        tile.landValue = Math.round(tile.basePrice * (tile.desirability / 50) * distMod);

        // Ground building simulation
        if (tile.groundBuilding && tile.groundBuilding.type !== 'ROAD' && tile.groundBuilding.type !== 'PIER') {
          const gb = tile.groundBuilding;
          if (gb.type === 'RESIDENTIAL') {
            // Residential hurt by industrial pollution and heavy traffic noise
            const penalty = tile.pollution + (trafficNoise * 0.5);
            if (penalty > 35) {
              gb.rentIncome = Math.max(5, Math.round((gb.level * 80) * Math.max(0.1, (100 - penalty) / 100)));
              gb.health = Math.max(20, gb.health - 0.2);
            } else {
              gb.rentIncome = Math.round(gb.level * 85 * (tile.desirability / 50));
              gb.health = Math.min(100, gb.health + 0.1);
            }
          } else if (gb.type === 'COMMERCIAL') {
            // Commercial boosted by nearby labor, high-capacity road foot traffic, and port commerce!
            const laborFactor = Math.min(1.5, Math.max(0.4, nearbyLabor / 30));
            const trafficMultiplier = 1.0 + roadCommSynergy + (portBonus * 0.5);
            gb.rentIncome = Math.round(gb.level * 110 * laborFactor * trafficMultiplier * (tile.desirability / 50));
          } else if (gb.type === 'INDUSTRIAL') {
            // Industrial boosted by port throughput and arterial freight links
            const industrialMultiplier = 1.0 + (portBonus * 0.6) + (roadCommSynergy * 0.3);
            gb.rentIncome = Math.round(gb.level * 140 * industrialMultiplier);
          } else if (gb.type === 'PORT') {
            gb.rentIncome = Math.round(350 * (1.0 + portBonus));
          }
        }
      }
    }
  }

  applyAoE(map, cx, cy, radius, strength) {
    const size = this.gameState.gridSize;
    const minX = Math.max(0, cx - radius);
    const maxX = Math.min(size - 1, cx + radius);
    const minY = Math.max(0, cy - radius);
    const maxY = Math.min(size - 1, cy + radius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= radius) {
          const falloff = 1 - (dist / radius);
          map[x][y] += strength * falloff;
        }
      }
    }
  }
}

module.exports = CellularAutomata;
