// server/engine/GameState.js
// Authoritative Persistent Game State for 50 Concurrent Firms, 10 Districts, and Grid

const GRID_SIZE = 60; // 60x60 isometric grid

class GameState {
  constructor() {
    this.gridSize = GRID_SIZE;
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
      pendingVariances: [], // Active ZBA applications
      electionCycleTicks: 600, // Every ~600 ticks (~5 mins at 2 ticks/sec)
      nextElectionTick: 600,
      militaryCampaign: null, // Active foreign expedition
      foreignRelations: {
        nation: 'Federation of Valoria (Rare-Earth Monopolist)',
        relationsScore: 65, // 0..100
        embargoActive: false,
        tariffRate: 0.10, // 10%
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

    // 10 Legislative Districts (Philadelphia-inspired)
    this.districts = [
      { id: 1, name: 'District 1: Financial Core', councilmember: { name: 'Councilman Sterling Jr.', firmId: 'npc_c1', trait: 'Pro-Business' }, color: '#3b82f6', landValueMod: 1.4, baseZoning: 'COMMERCIAL' },
      { id: 2, name: 'District 2: University & Innovation', councilmember: { name: 'Dr. Aris Thorne', firmId: 'npc_c2', trait: 'Technocrat' }, color: '#8b5cf6', landValueMod: 1.3, baseZoning: 'COMMERCIAL' },
      { id: 3, name: 'District 3: Industrial Riverfront', councilmember: { name: 'Sal "Wrench" Sullivan', firmId: 'npc_c3', trait: 'Pro-Union' }, color: '#ef4444', landValueMod: 0.8, baseZoning: 'INDUSTRIAL' },
      { id: 4, name: 'District 4: Historic Old City', councilmember: { name: 'Eleanor Vance', firmId: 'npc_c4', trait: 'Preservationist' }, color: '#f59e0b', landValueMod: 1.2, baseZoning: 'RESIDENTIAL' },
      { id: 5, name: 'District 5: Southside Freight Hub', councilmember: { name: 'Dominic Russo', firmId: 'npc_c5', trait: 'Pro-Industrial' }, color: '#64748b', landValueMod: 0.75, baseZoning: 'INDUSTRIAL' },
      { id: 6, name: 'District 6: Westpark Eco-Gardens', councilmember: { name: 'Tara Green', firmId: 'npc_c6', trait: 'Radical Environmentalist' }, color: '#10b981', landValueMod: 1.15, baseZoning: 'RESIDENTIAL' },
      { id: 7, name: 'District 7: Northeast Commercial Corridor', councilmember: { name: 'Howard Ortiz', firmId: 'npc_c7', trait: 'Centrist' }, color: '#06b6d4', landValueMod: 1.0, baseZoning: 'COMMERCIAL' },
      { id: 8, name: 'District 8: Navy Yard & Maritime Dock', councilmember: { name: 'Admiral James Burke', firmId: 'npc_c8', trait: 'Pro-Military' }, color: '#0284c7', landValueMod: 0.9, baseZoning: 'INDUSTRIAL' },
      { id: 9, name: 'District 9: Antigravity Proving Heights', councilmember: { name: 'Nova Vance-Kowalski', firmId: 'npc_c9', trait: 'Antigravity Speculator' }, color: '#a855f7', landValueMod: 1.5, baseZoning: 'COMMERCIAL' },
      { id: 10, name: 'District 10: Suburbia Foothills', councilmember: { name: 'Karen Davenport', firmId: 'npc_c10', trait: 'NIMBY Conservative' }, color: '#ec4899', landValueMod: 1.05, baseZoning: 'RESIDENTIAL' }
    ];

    // Initialize municipal council seats
    this.municipal.councilSeats = this.districts.map(d => ({
      districtId: d.id,
      districtName: d.name,
      holderName: d.councilmember.name,
      holderFirmId: d.councilmember.firmId,
      trait: d.councilmember.trait,
      isNPC: true
    }));

    // 50 Player & NPC Construction Firms
    this.firms = new Map();

    // The Grid: 60x60 isometric cells
    this.grid = [];
    this.initGrid();

    // Initialize Firms (Firm 1 is Human Player slot, Firms 2-50 are AI bot competitors)
    this.initFirms();

    // ChangeTree to track dirty mutated states for low-bandwidth delta broadcast
    this.dirtyTiles = new Set(); // set of "x,y"
    this.dirtyFirms = new Set(); // set of firmId
    this.dirtyMarket = true;
    this.dirtyPolitics = true;
    this.newsFeed = [];
  }

  initGrid() {
    this.grid = new Array(this.gridSize);
    for (let x = 0; x < this.gridSize; x++) {
      this.grid[x] = new Array(this.gridSize);
      for (let y = 0; y < this.gridSize; y++) {
        const districtId = this.calculateDistrictId(x, y);
        const district = this.districts.find(d => d.id === districtId);

        // Procedural terrain features: river through middle
        const isRiver = (x > 26 && x < 32 && y > 10 && y < 55) || (y > 27 && y < 31 && x < 28);
        const isPark = !isRiver && (x % 11 === 0 && y % 11 === 0);

        const baseLandValue = Math.round((2000 + (Math.sin(x * 0.2) + Math.cos(y * 0.2)) * 600) * (district ? district.landValueMod : 1.0));

        this.grid[x][y] = {
          x,
          y,
          districtId,
          isWater: isRiver,
          ownerId: null,
          zoning: isRiver ? 'WATER' : (isPark ? 'CIVIC' : 'NONE'),
          basePrice: isRiver ? 0 : baseLandValue,
          landValue: isRiver ? 0 : baseLandValue,
          pollution: 0,
          crime: 0,
          traffic: 0,
          desirability: 50,
          hasPower: true,
          hasWater: true,
          hasTransit: true,
          // Ground level building (Level 1..3)
          groundBuilding: isPark ? {
            type: 'PARK',
            level: 1,
            name: 'Municipal Green Oasis',
            constructedTick: 0,
            health: 100,
            taxAbatedUntil: 999999,
            unionBuilt: true,
            rentIncome: 0,
            pollution: -15,
            crime: -5,
            population: 0,
            workers: 4
          } : null,
          // Floating Antigravity level (Level 4 Arcology)
          floatingBuilding: null
        };
      }
    }
  }

  calculateDistrictId(x, y) {
    // Partition 60x60 into 10 cohesive zones
    if (x < 20 && y < 20) return 1; // Financial Core
    if (x >= 20 && x < 40 && y < 20) return 2; // University & Innovation
    if (x >= 40 && y < 20) return 9; // Antigravity Proving Heights
    if (x < 20 && y >= 20 && y < 40) return 4; // Historic Old City
    if (x >= 20 && x < 40 && y >= 20 && y < 40) return 7; // Commercial Corridor
    if (x >= 40 && y >= 20 && y < 40) return 10; // Suburbia Foothills
    if (x < 20 && y >= 40) return 3; // Industrial Riverfront
    if (x >= 20 && x < 40 && y >= 40) return 6; // Westpark Eco-Gardens
    if (x >= 40 && y >= 40 && x < 50) return 5; // Southside Freight
    return 8; // Navy Yard Maritime Dock
  }

  initFirms() {
    const BOT_NAMES = [
      'Apex Horizon Const.', 'Vanguard Heavy Industries', 'Solaria Skyworks', 'Titan Infrastructure',
      'Quantum Urban Dynamics', 'Ironclad Masonry Corp', 'NeoPhilly Development Ltd', 'Aegis Civil Engineering',
      'Keystone Arcologies Inc', 'Liberty Bell Builders', 'Zenith Modular Systems', 'Franklin Power & Transit',
      'Bespoke Habitat Works', 'Metropolis Synergy Group', 'Hyperion Levitating Estates', 'Penn Green Building Co',
      'Schuylkill Concrete Dynamics', 'Broad Street Holdings', 'Center City Real Estate Syndicate', 'Rittenhouse Luxury Towers',
      'Fishtown Industrial Forge', 'Manayunk Highrise Collective', 'Overbrook Modular Housing', 'Kensington Steelworks',
      'Society Hill Heritage Builders', 'Fairmount Eco-Infrastructure', 'Chestnut Hill Antigravity Labs', 'Logan Square Construction',
      'University City Tech Campuses', 'Northern Liberties Developments', 'Point Breeze Civil Works', 'Passyunk Logistics & Transit',
      'Spring Garden Concrete Works', 'Queen Village Architectures', 'Cobbs Creek Green Spaces', 'Chinatown Unionized Construction',
      'Old City Historic Renovations', 'Brewerytown Heavy Builders', 'Bella Vista Skylines', 'East Falls Gravity Defiers',
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
      totalArcologies: 0,
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
        totalArcologies: 0,
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
      type, // 'info', 'warning', 'critical', 'success', 'politics', 'market'
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
