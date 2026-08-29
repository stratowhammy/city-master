// server/engine/GameState.js
// Authoritative Persistent Game State for 50 Concurrent Firms, 10 Districts,
// Curving Coastline with 3 Maritime Ports, Dynamic Road Network (3-Tile Frontier Expansion), and Sector Chunking.

const GRID_SIZE = 60; // 60x60 isometric grid
const CHUNK_SIZE = 15; // 15x15 sector chunks for viewport culling

class GameState {
  constructor() {
    this.gridSize = GRID_SIZE;
    this.chunkSize = CHUNK_SIZE;
    this.chunksX = Math.ceil(this.gridSize / this.chunkSize);
    this.chunksY = Math.ceil(this.gridSize / this.chunkSize);

    this.tick = 0;
    this.lastTimestamp = Date.now();
    this.reconnectionTokens = new Map(); // token -> { firmId, disconnectedAt }

    // Municipal & Politics
    this.municipal = {
      treasury: 2500000,
      propertyTaxRate: 0.045, // 4.5%
      wageTaxRate: 0.038, // 3.8%
      mayor: {
        firmId: 'npc_mayor',
        name: 'Mayor Reginald Sterling',
        isNPC: true,
        alignment: 'Pro-Business Centrist',
        termExpiresTick: 1200
      },
      councilSeats: [], // 10 seats
      zbaMembers: [
        { id: 1, name: 'Elena Rostova', allegiance: 'Mayor', lean: 'Pro-Development' },
        { id: 2, name: 'Marcus Brody', allegiance: 'Union', lean: 'Pro-Labor' },
        { id: 3, name: 'Diane Washington', allegiance: 'District 3', lean: 'Environmentalist' },
        { id: 4, name: 'Dr. Aris Thorne', allegiance: 'Tech', lean: 'Antigravity Innovation' },
        { id: 5, name: 'Arthur Vance', allegiance: 'Central Bank', lean: 'Fiscal Conservative' }
      ],
      pendingVariances: [],
      electionCycleTicks: 600,
      nextElectionTick: 600,
      militaryCampaign: null,
      foreignRelations: {
        nation: 'Federation of Valoria (Maritime & Resource Exporter)',
        relationsScore: 65,
        embargoActive: false,
        tariffRate: 0.10,
        activeTreatyUntilTick: 0
      }
    };

    // Macroeconomic Resource Exchange
    this.resources = {
      concrete: { name: 'Concrete', spotPrice: 45, supply: 10000, demand: 5000, history: [45] },
      steel: { name: 'Structural Steel', spotPrice: 120, supply: 6000, demand: 4000, history: [120] },
      timber: { name: 'Engineered Timber', spotPrice: 35, supply: 12000, demand: 4500, history: [35] },
      rareEarth: { name: 'Rare-Earth Elements', spotPrice: 450, supply: 2000, demand: 1800, history: [450], foreignControlled: true },
      superconductors: { name: 'High-Temp Superconductors', spotPrice: 850, supply: 1200, demand: 1100, history: [850], foreignControlled: true }
    };

    // 10 Legislative Districts
    this.districts = [
      { id: 1, name: 'District 1: Financial Core', councilmember: { name: 'Councilman Sterling Jr.', firmId: 'npc_c1', trait: 'Pro-Business' }, color: '#3b82f6', landValueMod: 1.4, baseZoning: 'COMMERCIAL' },
      { id: 2, name: 'District 2: University & Innovation', councilmember: { name: 'Dr. Aris Thorne', firmId: 'npc_c2', trait: 'Technocrat' }, color: '#8b5cf6', landValueMod: 1.3, baseZoning: 'COMMERCIAL' },
      { id: 3, name: 'District 3: Industrial Riverfront', councilmember: { name: 'Sal "Wrench" Sullivan', firmId: 'npc_c3', trait: 'Pro-Union' }, color: '#ef4444', landValueMod: 0.8, baseZoning: 'INDUSTRIAL' },
      { id: 4, name: 'District 4: Historic Old City', councilmember: { name: 'Eleanor Vance', firmId: 'npc_c4', trait: 'Preservationist' }, color: '#f59e0b', landValueMod: 1.2, baseZoning: 'RESIDENTIAL' },
      { id: 5, name: 'District 5: Southside Freight Hub', councilmember: { name: 'Dominic Russo', firmId: 'npc_c5', trait: 'Pro-Industrial' }, color: '#64748b', landValueMod: 0.75, baseZoning: 'INDUSTRIAL' },
      { id: 6, name: 'District 6: Westpark Eco-Gardens', councilmember: { name: 'Tara Green', firmId: 'npc_c6', trait: 'Radical Environmentalist' }, color: '#10b981', landValueMod: 1.15, baseZoning: 'RESIDENTIAL' },
      { id: 7, name: 'District 7: Northeast Commercial Corridor', councilmember: { name: 'Howard Ortiz', firmId: 'npc_c7', trait: 'Centrist' }, color: '#06b6d4', landValueMod: 1.0, baseZoning: 'COMMERCIAL' },
      { id: 8, name: 'District 8: Navy Yard & Maritime Dock', councilmember: { name: 'Admiral James Burke', firmId: 'npc_c8', trait: 'Pro-Military' }, color: '#0284c7', landValueMod: 0.9, baseZoning: 'INDUSTRIAL' },
      { id: 9, name: 'District 9: Highrise Proving Heights', councilmember: { name: 'Nova Vance-Kowalski', firmId: 'npc_c9', trait: 'Real Estate Speculator' }, color: '#a855f7', landValueMod: 1.5, baseZoning: 'COMMERCIAL' },
      { id: 10, name: 'District 10: Suburbia Foothills', councilmember: { name: 'Karen Davenport', firmId: 'npc_c10', trait: 'NIMBY Conservative' }, color: '#ec4899', landValueMod: 1.05, baseZoning: 'RESIDENTIAL' }
    ];

    this.municipal.councilSeats = this.districts.map(d => ({
      districtId: d.id,
      districtName: d.name,
      holderName: d.councilmember.name,
      holderFirmId: d.councilmember.firmId,
      trait: d.councilmember.trait,
      isNPC: true
    }));

    // 3 Distinct Maritime Ports Definitions
    this.maritimePorts = [
      {
        id: 'port_north',
        name: '⚓ North Port (Container Freight Terminal)',
        x: 12,
        y: 44,
        type: 'CONTAINER_TERMINAL',
        pierTiles: [{ x: 12, y: 45 }, { x: 12, y: 46 }, { x: 13, y: 46 }],
        economicBonus: { industrial: 1.25, tradeVolume: 450 }
      },
      {
        id: 'port_central',
        name: '⚓ Central Harbor (Commercial Ferry & Deep-Water Pier)',
        x: 30,
        y: 45,
        type: 'COMMERCIAL_HARBOR',
        pierTiles: [{ x: 30, y: 46 }, { x: 30, y: 47 }, { x: 29, y: 46 }],
        economicBonus: { commercial: 1.30, tourism: 500 }
      },
      {
        id: 'port_south',
        name: '⚓ South Marine Terminal (Shipbuilding & Drydock)',
        x: 48,
        y: 46,
        type: 'NAVAL_DRYDOCK',
        pierTiles: [{ x: 48, y: 47 }, { x: 48, y: 48 }, { x: 47, y: 47 }],
        economicBonus: { industrial: 1.20, heavyCargo: 380 }
      }
    ];

    this.firms = new Map();
    this.grid = [];
    this.initGrid();
    this.initFirms();

    // Initial Road Network and 3-Tile Outward Expansion
    this.updateRoadNetwork();

    this.dirtyTiles = new Set();
    this.dirtyFirms = new Set();
    this.dirtyMarket = true;
    this.dirtyPolitics = true;
    this.newsFeed = [];
  }

  // Curving Coastline function: returns true if (x, y) is in the ocean
  isOceanWater(x, y) {
    // Smooth curving coastline along the southern edge (y >= 48 + sin(x * 0.14) * 4.5)
    const coastThreshold = 48 + Math.sin(x * 0.14) * 4.5 + Math.cos(x * 0.08) * 1.5;
    return y >= coastThreshold;
  }

  initGrid() {
    this.grid = new Array(this.gridSize);
    for (let x = 0; x < this.gridSize; x++) {
      this.grid[x] = new Array(this.gridSize);
      for (let y = 0; y < this.gridSize; y++) {
        const districtId = this.calculateDistrictId(x, y);
        const district = this.districts.find(d => d.id === districtId);

        // Curving Coastline on bottom edge + River through District 3/6
        const isOcean = this.isOceanWater(x, y);
        const isRiver = !isOcean && (x > 26 && x < 30 && y > 12 && y < 45);
        const isWater = isOcean || isRiver;

        const baseLandValue = isWater ? 0 : Math.round((2500 + (Math.sin(x * 0.2) + Math.cos(y * 0.2)) * 600) * (district ? district.landValueMod : 1.0));

        this.grid[x][y] = {
          x,
          y,
          districtId,
          isWater,
          isCoastline: !isWater && this.isOceanWater(x, y + 1),
          ownerId: null,
          zoning: isWater ? 'WATER' : 'NONE',
          basePrice: baseLandValue,
          landValue: baseLandValue,
          pollution: 0,
          crime: 0,
          traffic: 0,
          desirability: isWater ? 0 : 50,
          roadLevel: 0, // 0 = no road, 1 = Local Street, 2 = Avenue, 3 = Boulevard, 4 = Arterial
          roadSynergyBonus: 0, // AoE multiplier applied from high-density roads
          trafficNoisePenalty: 0, // Noise penalty depressing residential
          perimeterForSale: false,
          groundBuilding: null,
          floatingBuilding: null
        };
      }
    }

    // 1. Establish 3 Maritime Ports along the Coastline
    for (const port of this.maritimePorts) {
      const tile = this.grid[port.x] && this.grid[port.x][port.y];
      if (tile && !tile.isWater) {
        tile.ownerId = 'npc_mayor';
        tile.zoning = 'CIVIC';
        tile.groundBuilding = {
          type: 'PORT',
          portId: port.id,
          level: 1,
          name: port.name,
          constructedTick: 0,
          health: 100,
          taxAbatedUntil: 999999,
          unionBuilt: true,
          rentIncome: 350,
          pollution: 15,
          crime: 5,
          population: 0,
          workers: 80
        };

        // Pier Docks extending into water
        for (const pier of port.pierTiles) {
          if (this.grid[pier.x] && this.grid[pier.x][pier.y]) {
            const pt = this.grid[pier.x][pier.y];
            pt.isWater = true;
            pt.groundBuilding = {
              type: 'PIER',
              name: `${port.name.split(' ')[1]} Deep Pier`,
              level: 1
            };
          }
        }
      }
    }

    // 2. Populate Starting Clusters of Pre-Existing Level 1 Buildings around Ports
    this.populateStartingPortClusters();
  }

  populateStartingPortClusters() {
    const clusterOffsets = [
      { dx: 0, dy: -1, type: 'COMMERCIAL', name: 'Harbor Fish Market & Supplies' },
      { dx: -1, dy: 0, type: 'INDUSTRIAL', name: 'Maritime Cargo Warehouse' },
      { dx: 1, dy: 0, type: 'COMMERCIAL', name: 'Dockworkers Diner & Goods' },
      { dx: 0, dy: -2, type: 'RESIDENTIAL', name: 'Seafarer Cottage' },
      { dx: -1, dy: -1, type: 'RESIDENTIAL', name: 'Dockside Residence' },
      { dx: 1, dy: -1, type: 'INDUSTRIAL', name: 'Port Repair Workshop' }
    ];

    for (const port of this.maritimePorts) {
      clusterOffsets.forEach((off, idx) => {
        const cx = port.x + off.dx;
        const cy = port.y + off.dy;
        if (cx >= 0 && cx < this.gridSize && cy >= 0 && cy < this.gridSize) {
          const t = this.grid[cx][cy];
          if (t && !t.isWater && !t.groundBuilding) {
            t.ownerId = `firm_bot_${(idx % 6) + 2}`;
            t.zoning = off.type;
            t.groundBuilding = {
              type: off.type,
              level: 1,
              name: off.name,
              constructedTick: 0,
              health: 100,
              taxAbatedUntil: 0,
              unionBuilt: true,
              rentIncome: off.type === 'COMMERCIAL' ? 95 : (off.type === 'RESIDENTIAL' ? 80 : 130),
              pollution: off.type === 'INDUSTRIAL' ? 25 : 0,
              crime: 0,
              population: off.type === 'RESIDENTIAL' ? 120 : 0,
              workers: off.type === 'COMMERCIAL' ? 50 : (off.type === 'INDUSTRIAL' ? 30 : 0)
            };
          }
        }
      });
    }

    // Also populate a central municipal historic town center near District 1/4 (x=16..22, y=20..25)
    for (let x = 18; x <= 22; x++) {
      for (let y = 20; y <= 24; y++) {
        const t = this.grid[x][y];
        if (t && !t.isWater && !t.groundBuilding && (x + y) % 2 === 0) {
          const type = (x === 20 && y === 22) ? 'COMMERCIAL' : (x % 2 === 0 ? 'RESIDENTIAL' : 'COMMERCIAL');
          t.ownerId = 'firm_bot_3';
          t.zoning = type;
          t.groundBuilding = {
            type,
            level: 1,
            name: `${type === 'COMMERCIAL' ? 'Historic Market' : 'Old City Townhouse'} L1`,
            constructedTick: 0,
            health: 100,
            taxAbatedUntil: 0,
            unionBuilt: true,
            rentIncome: 90,
            pollution: 0,
            crime: 0,
            population: type === 'RESIDENTIAL' ? 140 : 0,
            workers: type === 'COMMERCIAL' ? 60 : 0
          };
        }
      }
    }
  }

  // Update Road Network: Connects all buildings, extends 3 tiles outward, and upgrades road densities
  updateRoadNetwork() {
    const size = this.gridSize;
    const roadSet = new Set();
    const developedTiles = [];

    // Step 1: Find all developed parcels (buildings or owned land)
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid[x][y];
        if (!t || t.isWater) continue;

        if (t.groundBuilding && t.groundBuilding.type !== 'ROAD' && t.groundBuilding.type !== 'PIER') {
          developedTiles.push({ x, y, level: t.groundBuilding.level || 1 });
        } else if (t.ownerId) {
          developedTiles.push({ x, y, level: 1 });
        }
      }
    }

    // Step 2: Establish street grid connecting developed parcels
    // Add roads adjacent to every developed building
    for (const d of developedTiles) {
      const neighbors = [
        { x: d.x + 1, y: d.y }, { x: d.x - 1, y: d.y },
        { x: d.x, y: d.y + 1 }, { x: d.x, y: d.y - 1 }
      ];
      for (const n of neighbors) {
        if (n.x >= 0 && n.x < size && n.y >= 0 && n.y < size) {
          const nt = this.grid[n.x][n.y];
          if (nt && !nt.isWater && (!nt.groundBuilding || nt.groundBuilding.type === 'ROAD')) {
            roadSet.add(`${n.x},${n.y}`);
          }
        }
      }
    }

    // Connect Ports to Central Arterial Spine (Avenue corridors)
    for (const port of this.maritimePorts) {
      for (let y = port.y - 1; y >= 20; y--) {
        const t = this.grid[port.x][y];
        if (t && !t.isWater && (!t.groundBuilding || t.groundBuilding.type === 'ROAD')) {
          roadSet.add(`${port.x},${y}`);
        }
      }
    }
    // East-West connecting cross-avenues at y=22, y=32, y=42
    [22, 32, 42].forEach(crossY => {
      for (let x = 8; x <= 52; x++) {
        const t = this.grid[x] && this.grid[x][crossY];
        if (t && !t.isWater && (!t.groundBuilding || t.groundBuilding.type === 'ROAD')) {
          roadSet.add(`${x},${crossY}`);
        }
      }
    });

    // Step 3: Outward Road Expansion: Generate up to 3 tiles beyond outermost developed buildings
    const expansionQueue = [];
    for (const key of roadSet) {
      const [rx, ry] = key.split(',').map(Number);
      expansionQueue.push({ x: rx, y: ry, dist: 0 });
    }

    // Breadth-first expansion up to 3 tiles outward
    const visitedRoads = new Set(roadSet);
    while (expansionQueue.length > 0) {
      const cur = expansionQueue.shift();
      if (cur.dist >= 3) continue;

      const adj = [
        { x: cur.x + 1, y: cur.y }, { x: cur.x - 1, y: cur.y },
        { x: cur.x, y: cur.y + 1 }, { x: cur.x, y: cur.y - 1 }
      ];

      for (const n of adj) {
        if (n.x >= 0 && n.x < size && n.y >= 0 && n.y < size) {
          const key = `${n.x},${n.y}`;
          const nt = this.grid[n.x][n.y];
          if (nt && !nt.isWater && !nt.ownerId && !visitedRoads.has(key)) {
            // Keep straight road grid lines (aligned with even/odd streets)
            if (n.x % 3 === 0 || n.y % 3 === 0 || n.y === 42 || n.y === 32 || n.y === 22) {
              visitedRoads.add(key);
              roadSet.add(key);
              expansionQueue.push({ x: n.x, y: n.y, dist: cur.dist + 1 });
            }
          }
        }
      }
    }

    // Step 4: Apply Road Tiles & Calculate Density Visual Levels (Levels 1 to 4)
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid[x][y];
        if (!t || t.isWater) continue;

        const isRoad = roadSet.has(`${x},${y}`);
        if (isRoad) {
          // Determine Road Density Level from max adjacent building density
          let maxAdjLevel = 1;
          const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 }
          ];

          for (const n of neighbors) {
            if (n.x >= 0 && n.x < size && n.y >= 0 && n.y < size) {
              const nb = this.grid[n.x][n.y] && this.grid[n.x][n.y].groundBuilding;
              if (nb && nb.level) {
                maxAdjLevel = Math.max(maxAdjLevel, nb.level);
              }
            }
          }

          // Main Port Spine roads default to Level 2 Avenue or higher
          if (x === 12 || x === 30 || x === 48 || y === 22 || y === 32) {
            maxAdjLevel = Math.max(maxAdjLevel, 2);
          }

          t.roadLevel = maxAdjLevel;
          t.groundBuilding = {
            type: 'ROAD',
            level: maxAdjLevel,
            name: maxAdjLevel === 1 ? 'Local Street' : (maxAdjLevel === 2 ? 'Multi-Lane Avenue' : (maxAdjLevel === 3 ? 'High-Capacity Boulevard' : 'Commercial Arterial'))
          };
          t.zoning = 'CIVIC';
        } else if (t.groundBuilding && t.groundBuilding.type === 'ROAD') {
          t.groundBuilding = null;
          t.roadLevel = 0;
          t.zoning = 'NONE';
        }
      }
    }

    // Step 5: Automatically Zone & Price Any Unowned Tile Adjacent to the Extended Road Network
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = this.grid[x][y];
        if (!t || t.isWater || t.ownerId || (t.groundBuilding && t.groundBuilding.type === 'ROAD')) {
          if (t) t.perimeterForSale = false;
          continue;
        }

        // Check if adjacent to any road tile
        const hasRoadNeighbor = [
          { x: x + 1, y }, { x: x - 1, y },
          { x, y: y + 1 }, { x, y: y - 1 }
        ].some(n => n.x >= 0 && n.x < size && n.y >= 0 && n.y < size && this.grid[n.x][n.y] && this.grid[n.x][n.y].roadLevel > 0);

        if (hasRoadNeighbor) {
          t.perimeterForSale = true;
          // Dynamically price based on proximity to nearest port and district modifier
          const district = this.districts.find(d => d.id === t.districtId);
          const distMod = district ? district.landValueMod : 1.0;
          const nearestPortDist = Math.min(...this.maritimePorts.map(p => Math.hypot(x - p.x, y - p.y)));
          const portBonus = Math.max(0, Math.round((40 - nearestPortDist) * 80));

          t.basePrice = Math.round((3000 + portBonus) * distMod);
          t.landValue = t.basePrice;
        } else {
          t.perimeterForSale = false;
        }
      }
    }
  }

  // Dynamic Chunking / Viewport Bounding Box helper
  getChunk(chunkX, chunkY) {
    if (chunkX < 0 || chunkX >= this.chunksX || chunkY < 0 || chunkY >= this.chunksY) return null;
    const startX = chunkX * this.chunkSize;
    const startY = chunkY * this.chunkSize;
    const endX = Math.min(this.gridSize, startX + this.chunkSize);
    const endY = Math.min(this.gridSize, startY + this.chunkSize);

    const tiles = [];
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        tiles.push(this.grid[x][y]);
      }
    }
    return { chunkX, chunkY, startX, startY, endX, endY, tiles };
  }

  calculateDistrictId(x, y) {
    if (x < 20 && y < 20) return 1; // Financial Core
    if (x >= 20 && x < 40 && y < 20) return 2; // University & Innovation
    if (x >= 40 && y < 20) return 9; // Highrise Proving Heights
    if (x < 20 && y >= 20 && y < 40) return 4; // Historic Old City
    if (x >= 20 && x < 40 && y >= 20 && y < 40) return 7; // Commercial Corridor
    if (x >= 40 && y >= 20 && y < 40) return 10; // Suburbia Foothills
    if (x < 20 && y >= 40) return 3; // Industrial Riverfront / North Port
    if (x >= 20 && x < 40 && y >= 40) return 6; // Westpark Eco-Gardens / Central Harbor
    if (x >= 40 && y >= 40 && x < 50) return 5; // Southside Freight
    return 8; // Navy Yard Maritime Dock / South Marine Terminal
  }

  initFirms() {
    const BOT_NAMES = [
      'Apex Horizon Const.', 'Vanguard Heavy Industries', 'Solaria Skyworks', 'Titan Infrastructure',
      'Quantum Urban Dynamics', 'Ironclad Masonry Corp', 'NeoPhilly Development Ltd', 'Aegis Civil Engineering',
      'Keystone Builders Inc', 'Liberty Bell Builders', 'Zenith Modular Systems', 'Franklin Power & Transit',
      'Bespoke Habitat Works', 'Metropolis Synergy Group', 'Hyperion Estates', 'Penn Green Building Co',
      'Schuylkill Concrete Dynamics', 'Broad Street Holdings', 'Center City Real Estate Syndicate', 'Rittenhouse Luxury Towers',
      'Fishtown Industrial Forge', 'Manayunk Highrise Collective', 'Overbrook Modular Housing', 'Kensington Steelworks',
      'Society Hill Heritage Builders', 'Fairmount Eco-Infrastructure', 'Chestnut Hill Labs', 'Logan Square Construction',
      'University City Tech Campuses', 'Northern Liberties Developments', 'Point Breeze Civil Works', 'Passyunk Logistics & Transit',
      'Spring Garden Concrete Works', 'Queen Village Architectures', 'Cobbs Creek Green Spaces', 'Chinatown Unionized Construction',
      'Old City Historic Renovations', 'Brewerytown Heavy Builders', 'Bella Vista Skylines', 'East Falls Builders',
      'Girard Precision Engineering', 'Bala Cynwyd Global Real Estate', 'Roxborough Structural Guild', 'Port Richmond Freight Guild',
      'Southwark Marine Facilities', 'Wharton Strategic Capital Builders', 'Pennsport Civic Contracts', 'Kingsessing Heavy Masonry',
      'Graduate Hospital Bio-Towers'
    ];

    const COLORS = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
      '#eab308', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#d946ef', '#0ea5e9', '#22c55e'
    ];

    // Create Firm 1 (Player's default firm)
    const playerFirm = {
      id: 'firm_player_1',
      name: 'Pinnacle Metro Enterprises',
      isHuman: true,
      color: '#3b82f6',
      cash: 150000,
      influencePoints: 80,
      unionLoyalty: 50,
      taxAbatementsActive: 0,
      totalBuildings: 0,
      totalLand: 0,
      stock: {
        totalShares: 100000,
        publicShares: 35000,
        price: 15.00,
        nav: 15.00,
        history: [15.00, 15.00, 15.00]
      },
      shareHoldings: { firm_player_1: 65000 },
      shortPositions: {},
      marginLoan: {
        borrowedAmount: 0,
        collateralShares: 0
      },
      marginStatus: 'HEALTHY',
      marginGraceExpiry: null,
      politicalSeat: null,
      netWorth: 150000,
      hourlyRevenue: 0,
      hourlyMaintenance: 0,
      inventory: {
        concrete: 150,
        steel: 80,
        timber: 200,
        rareEarth: 20,
        superconductors: 10
      }
    };
    this.firms.set(playerFirm.id, playerFirm);

    // Create 49 Bot Competitors
    for (let i = 0; i < 49; i++) {
      const botId = `firm_bot_${i + 2}`;
      const name = BOT_NAMES[i] || `Constellation Firm #${i + 2}`;
      const color = COLORS[(i + 1) % COLORS.length];
      const botFirm = {
        id: botId,
        name,
        isHuman: false,
        color,
        personality: ['TYCOON', 'ECO', 'UNION_LOYAL', 'SPECULATOR', 'POLITICIAN'][i % 5],
        cash: 90000 + Math.floor(Math.random() * 80000),
        influencePoints: 30 + Math.floor(Math.random() * 60),
        unionLoyalty: 40 + Math.floor(Math.random() * 40),
        taxAbatementsActive: 0,
        totalBuildings: 0,
        totalLand: 0,
        stock: {
          totalShares: 100000,
          publicShares: 40000,
          price: 10.00 + Math.random() * 5,
          nav: 12.00,
          history: [12.00]
        },
        shareHoldings: { [botId]: 60000 },
        shortPositions: {},
        marginLoan: {
          borrowedAmount: 0,
          collateralShares: 0
        },
        marginStatus: 'HEALTHY',
        marginGraceExpiry: null,
        politicalSeat: null,
        netWorth: 120000,
        hourlyRevenue: 0,
        hourlyMaintenance: 0,
        inventory: {
          concrete: 100,
          steel: 50,
          timber: 100,
          rareEarth: 10,
          superconductors: 5
        }
      };
      this.firms.set(botId, botFirm);
    }
  }

  addNews(headline, type = 'info', impact = null) {
    const item = {
      id: `${Date.now()}_${Math.random()}`,
      tick: this.tick,
      timestamp: Date.now(),
      headline,
      type,
      impact
    };
    this.newsFeed.unshift(item);
    if (this.newsFeed.length > 50) this.newsFeed.pop();
  }

  markTileDirty(x, y) {
    this.dirtyTiles.add(`${x},${y}`);
  }

  markFirmDirty(firmId) {
    this.dirtyFirms.add(firmId);
  }
}

module.exports = GameState;
