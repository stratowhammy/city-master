// public/js/engine/TileAssets.js
// Authentic 32-Bit Retro Pixel-Art Sprite & Canvas Texture Generator for 2:1 Dimetric Projection
// Features rich dithering, pixel-shaded buildings, animated smoke & water ripples, and crisp retro palettes.

class TileAssets {
  constructor() {
    this.cache = new Map();
    this.images = new Map();
    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;

    // Sprite cutouts catalog from the /bldg folder
    this.buildingSprites = {
      RESIDENTIAL_L1: [
        'middleClassHouse1.png', 'middleClassHouse2.png', 'middleClassHouse3.png', 'middleClassHouse4.png',
        'middleClassHouse5.png', 'middleClassHouse6.png', 'middleClassHouse7.png', 'middleClassHouse8.png',
        'middleClassHouse9.png', 'middleClassHouse10.png', 'middleClassHouse11.png', 'middleClassHouse12.png',
        'middleClassHouse13.png', 'middleClassHouse14.png', 'middleClassHouse15.png', 'middleClassHouse16.png'
      ],
      RESIDENTIAL_L2: [
        'upperMiddleClassHouse1.png', 'upperMiddleClassHouse2.png', 'upperMiddleClassHouse3.png', 'upperMiddleClassHouse4.png',
        'upperMiddleClassHouse5.png', 'upperMiddleClassHouse6.png', 'upperMiddleClassHouse7.png', 'upperMiddleClassHouse8.png',
        'upperMiddleClassHouse9.png', 'upperMiddleClassHouse10.png', 'upperMiddleClassHouse11.png', 'upperMiddleClassHouse12.png',
        'upperMiddleClassHouse13.png', 'upperMiddleClassHouse14.png', 'upperMiddleClassHouse15.png'
      ],
      RESIDENTIAL_L3: [
        'upperClassHousing1.png.png', 'upperClassHousing2.png', 'upperClassHousing3.png', 'upperClassHousing4.png',
        'upperClassHousing5.png', 'upperClassHousing6.png', 'upperClassHousing7.png', 'upperClassHousing8.png',
        'upperClassHousing9.png', 'upperClassHousing10.png', 'upperClassHousing11.png', 'upperClassHousing12.png'
      ],
      COMMERCIAL_L1: ['mediumBrickBuiling.png'],
      COMMERCIAL_L2: ['mediumBrickBuiling.png'],
      COMMERCIAL_L3: ['Mall.png'],
      INDUSTRIAL_L1: ['mediumFactory.png'],
      INDUSTRIAL_L2: ['mediumFactory.png'],
      INDUSTRIAL_L3: ['mediumFactory.png']
    };

    this.preloadBuildingSprites();
    this.initBaseSprites();
  }

  preloadBuildingSprites() {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return;
    const allFiles = new Set();
    Object.values(this.buildingSprites).forEach(list => list.forEach(f => allFiles.add(f)));
    allFiles.forEach(file => {
      const img = new Image();
      img.src = `/bldg/${file}`;
      img.onload = () => {
        this.images.set(file, img);
      };
    });
  }

  initBaseSprites() {
    // 1. 32-Bit Retro Grass Ground Terrain (Dithered with pixel blades & soil specks)
    this.createTileCanvas('ground_grass', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#2e7d32', '#1b5e20', '#388e3c', '#4caf50');

      // Pixel grass blades & dithering
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(w / 2 - 8, h / 2 - 4, 2, 2);
      ctx.fillRect(w / 2 + 10, h / 2 - 2, 2, 2);
      ctx.fillRect(w / 2 - 14, h / 2 + 2, 2, 2);
      ctx.fillRect(w / 2 + 4, h / 2 + 4, 2, 2);
      ctx.fillRect(w / 2 - 2, h / 2 - 8, 2, 2);

      // Darker blades
      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(w / 2 - 6, h / 2 - 2, 2, 2);
      ctx.fillRect(w / 2 + 12, h / 2 + 2, 2, 2);
      ctx.fillRect(w / 2 - 12, h / 2 + 6, 2, 2);

      // Subtle wildflower / stone pixel
      ctx.fillStyle = '#fff59d';
      ctx.fillRect(w / 2 + 6, h / 2 - 5, 2, 2);
      ctx.fillStyle = '#ff8a80';
      ctx.fillRect(w / 2 - 16, h / 2 - 1, 2, 2);
    });

    // 2. 32-Bit Retro Deep Ocean Water (Layered wave currents & specular glints)
    this.createTileCanvas('ground_water', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#0284c7', '#0369a1', '#0ea5e9', '#38bdf8');

      // Dark trench shadow
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(w / 2 - 16, h / 2 + 2, 8, 3);
      ctx.fillRect(w / 2 + 4, h / 2 - 4, 10, 3);

      // Light wave crest highlights
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(w / 2 - 18, h / 2 - 6, 6, 2);
      ctx.fillRect(w / 2 - 6, h / 2 - 1, 8, 2);
      ctx.fillRect(w / 2 + 8, h / 2 + 3, 6, 2);
      ctx.fillRect(w / 2 - 10, h / 2 + 6, 5, 2);

      // Specular white foam sparkle
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 16, h / 2 - 6, 2, 2);
      ctx.fillRect(w / 2 - 4, h / 2 - 1, 2, 2);
      ctx.fillRect(w / 2 + 10, h / 2 + 3, 2, 2);
    });

    // 3. 32-Bit Retro Concrete Urban Foundation (Pavement slabs & expansion joints)
    this.createTileCanvas('ground_concrete', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#475569', '#334155', '#64748b', '#94a3b8');

      // Expansion joints
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Pavement speckles
      ctx.fillStyle = '#334155';
      ctx.fillRect(w / 2 - 10, h / 2 - 3, 2, 2);
      ctx.fillRect(w / 2 + 8, h / 2 + 2, 2, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w / 2 - 4, h / 2 + 5, 2, 2);
      ctx.fillRect(w / 2 + 14, h / 2 - 4, 2, 2);
    });

    // 4. 32-Bit Road Level 1: Local 2-Lane Street (Charcoal asphalt, dashed yellow line, curb stones)
    this.createTileCanvas('road_lvl1', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#334155', '#1e293b', '#475569', '#64748b');

      // Curb highlight
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(w / 2 - 22, h / 2 - 10, 44, 20);

      // Yellow dashed center divider
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w / 2 - 2, h / 2 - 5, 4, 2);
      ctx.fillRect(w / 2 + 6, h / 2 - 1, 4, 2);
      ctx.fillRect(w / 2 - 10, h / 2 + 1, 4, 2);

      // Asphalt texture
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w / 2 - 8, h / 2 - 4, 2, 2);
      ctx.fillRect(w / 2 + 12, h / 2 + 4, 2, 2);
    });

    // 5. 32-Bit Road Level 2: Multi-Lane Avenue (Double yellow center, white dashes, crosswalk zebra stripes)
    this.createTileCanvas('road_lvl2', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#1e293b', '#0f172a', '#334155', '#475569');

      // Double solid center line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w / 2 - 2, h / 2 - 6, 2, 12);
      ctx.fillRect(w / 2 + 1, h / 2 - 6, 2, 12);

      // White lane dividers
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(w / 2 - 14, h / 2 - 3, 4, 2);
      ctx.fillRect(w / 2 + 10, h / 2 - 3, 4, 2);
      ctx.fillRect(w / 2 - 14, h / 2 + 3, 4, 2);
      ctx.fillRect(w / 2 + 10, h / 2 + 3, 4, 2);

      // White Crosswalk Zebra Stripes
      ctx.fillStyle = '#ffffff';
      for (let i = -16; i <= 16; i += 8) {
        ctx.fillRect(w / 2 + i, h / 2 - 10, 4, 2);
        ctx.fillRect(w / 2 + i, h / 2 + 8, 4, 2);
      }

      // Concrete Sidewalk Curbs
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(w / 2 - 26, h / 2 + 8, 52, 2);
    });

    // 6. 32-Bit Road Level 3: High-Capacity Boulevard (Green landscaped median, streetlights, painted arrows)
    this.createTileCanvas('road_lvl3', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#0f172a', '#020617', '#1e293b', '#38bdf8');

      // Landscaped Green Center Island
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Retro Pixel Street Trees on Median
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(w / 2 - 6, h / 2 - 2, 3, 0, Math.PI * 2);
      ctx.arc(w / 2 + 6, h / 2 + 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Retro Vintage Lamp Posts on Median with glowing halo
      ctx.fillStyle = '#475569';
      ctx.fillRect(w / 2 - 1, h / 2 - 14, 2, 12);
      // Glowing Lantern
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(w / 2 - 2, h / 2 - 16, 4, 3);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 15, 6, 0, Math.PI * 2);
      ctx.fill();

      // White lane arrows
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 18, h / 2 - 3, 6, 2);
      ctx.fillRect(w / 2 + 12, h / 2 - 3, 6, 2);
    });

    // 7. 32-Bit Road Level 4: Heavy Arterial Expressway (Concrete barriers, transit lanes, steel gantry)
    this.createTileCanvas('road_lvl4', (ctx, w, h) => {
      this.draw32BitIsoDiamond(ctx, w, h, '#020617', '#000000', '#0f172a', '#c084fc');

      // Cyan illuminated transit speed lanes
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(w / 2 - 20, h / 2 - 6, 3, 12);
      ctx.fillRect(w / 2 + 17, h / 2 - 6, 3, 12);

      // Heavy Concrete Jersey Barrier in Center
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w / 2 - 2, h / 2 - 8, 4, 16);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(w / 2 - 1, h / 2 - 8, 2, 16);

      // Overhead Steel Highway Gantry Signage
      ctx.fillStyle = '#475569';
      ctx.fillRect(w / 2 - 22, h / 2 - 20, 4, 18);
      ctx.fillRect(w / 2 + 18, h / 2 - 20, 4, 18);
      ctx.fillStyle = '#334155';
      ctx.fillRect(w / 2 - 22, h / 2 - 22, 44, 4);

      // Digital Green/Blue Overhead Route Displays
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(w / 2 - 18, h / 2 - 21, 16, 2);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(w / 2 + 2, h / 2 - 21, 16, 2);
    });
  }

  createTileCanvas(key, drawFn, width = this.TILE_WIDTH, height = this.TILE_HEIGHT + 40) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, width, this.TILE_HEIGHT);
    this.cache.set(key, canvas);
    return canvas;
  }

  // 32-Bit Beveled Isometric Diamond with Highlights and Depth Facets
  draw32BitIsoDiamond(ctx, w, h, fillTop, fillLeft, fillRight, strokeHighlight) {
    const hw = w / 2;
    const hh = h / 2;

    // Top Face
    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(w - 1, hh);
    ctx.lineTo(hw, h - 1);
    ctx.lineTo(0, hh);
    ctx.closePath();
    ctx.fillStyle = fillTop;
    ctx.fill();

    // Northwest Specular Highlight (Light Source from top-left)
    ctx.strokeStyle = strokeHighlight || 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(w - 1, hh);
    ctx.stroke();

    // Southeast Depth Shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 1, hh);
    ctx.lineTo(hw, h - 1);
    ctx.lineTo(0, hh);
    ctx.stroke();
  }

  // Draw Road Tile based on Level (1 to 4)
  drawRoadTile(ctx, screenX, screenY, roadLevel = 1) {
    let key = 'road_lvl1';
    if (roadLevel === 2) key = 'road_lvl2';
    else if (roadLevel === 3) key = 'road_lvl3';
    else if (roadLevel >= 4) key = 'road_lvl4';

    const sprite = this.cache.get(key);
    if (sprite) {
      ctx.drawImage(sprite, screenX - this.TILE_WIDTH / 2, screenY);
    } else {
      this.draw32BitIsoDiamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#334155', '#1e293b', '#475569', '#64748b');
    }
  }

  // Draw 32-Bit Maritime Port Hub (Terminal, Stacked Cargo Containers, Gantry Crane)
  drawMaritimePort(ctx, screenX, screenY, portBuilding) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const hw = w / 2;
    const hh = h / 2;

    ctx.save();
    ctx.translate(screenX - hw, screenY - hh);

    // Port concrete apron foundation
    this.draw32BitIsoDiamond(ctx, w, h, '#475569', '#334155', '#64748b', '#94a3b8');

    // 1. Port Logistics Terminal Brick Building (Left)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(hw - 22, hh - 20, 18, 16);
    // Brick texture & windows
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(hw - 20, hh - 18, 4, 4);
    ctx.fillRect(hw - 12, hh - 18, 4, 4);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(hw - 22, hh - 22, 18, 3); // Cornice

    // 2. 32-Bit Stacked Cargo Shipping Containers with Corrugated Ribs
    // Blue Container
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(hw + 2, hh - 12, 16, 8);
    ctx.strokeStyle = '#1d4ed8';
    ctx.strokeRect(hw + 2, hh - 12, 16, 8);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(hw + 5, hh - 10, 2, 4);
    ctx.fillRect(hw + 10, hh - 10, 2, 4);

    // Orange Container (Stacked on top)
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(hw + 4, hh - 20, 14, 7);
    ctx.strokeStyle = '#c2410c';
    ctx.strokeRect(hw + 4, hh - 20, 14, 7);
    ctx.fillStyle = '#fdba74';
    ctx.fillRect(hw + 7, hh - 18, 2, 3);

    // Emerald Green Container
    ctx.fillStyle = '#059669';
    ctx.fillRect(hw - 6, hh - 8, 12, 6);
    ctx.strokeStyle = '#047857';
    ctx.strokeRect(hw - 6, hh - 8, 12, 6);

    // 3. 32-Bit Heavy Gantry Cargo Crane (Lattice Trusswork)
    ctx.strokeStyle = '#dc2626'; // Red Crane Steel
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(hw - 12, hh + 4);
    ctx.lineTo(hw - 4, hh - 32);
    ctx.lineTo(hw + 8, hh + 4);
    ctx.moveTo(hw - 8, hh - 30);
    ctx.lineTo(hw + 24, hh - 30); // Boom
    ctx.stroke();

    // Crane Cable & Winch
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hw + 16, hh - 30);
    ctx.lineTo(hw + 16, hh - 14);
    ctx.stroke();

    // Suspended Yellow Cargo Box
    ctx.fillStyle = '#facc15';
    ctx.fillRect(hw + 12, hh - 14, 8, 6);
    ctx.strokeStyle = '#ca8a04';
    ctx.strokeRect(hw + 12, hh - 14, 8, 6);

    ctx.restore();
  }

  // Draw 32-Bit Pier Dock extending into ocean with moored vessel
  drawPierDock(ctx, screenX, screenY, pierBuilding) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const hw = w / 2;
    const hh = h / 2;

    ctx.save();
    ctx.translate(screenX - hw, screenY - hh);

    // Wooden/Concrete Pier Planks with Nail Rivets
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(hw, 4);
    ctx.lineTo(w - 6, hh);
    ctx.lineTo(hw, h - 4);
    ctx.lineTo(6, hh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wood plank grooves
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(hw - 12, hh - 3); ctx.lineTo(hw + 12, hh - 3);
    ctx.moveTo(hw - 10, hh + 3); ctx.lineTo(hw + 10, hh + 3);
    ctx.stroke();

    // Moored Cargo Vessel / Tugboat
    ctx.fillStyle = '#1e293b'; // Hull
    ctx.beginPath();
    ctx.moveTo(hw + 6, hh - 10);
    ctx.lineTo(hw + 26, hh - 2);
    ctx.lineTo(hw + 20, hh + 8);
    ctx.lineTo(hw + 2, hh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Ship Cabin & Red Funnel with puff
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(hw + 8, hh - 14, 8, 6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(hw + 11, hh - 18, 3, 4);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.fillRect(hw + 12, hh - 22, 2, 2);

    // Mooring Bollards
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(hw - 8, hh - 4, 3, 4);
    ctx.fillRect(hw + 6, hh - 4, 3, 4);

    ctx.restore();
  }

  // Draw Ground Building using authentic /bldg sprite cutouts
  drawGroundBuilding(ctx, screenX, screenY, building, ownerColor = '#3b82f6', gridX = 0, gridY = 0) {
    const type = building.type;
    if (type === 'ROAD') {
      this.drawRoadTile(ctx, screenX, screenY, building.level || 1);
      return;
    }
    if (type === 'PORT') {
      this.drawMaritimePort(ctx, screenX, screenY, building);
      return;
    }
    if (type === 'PIER') {
      this.drawPierDock(ctx, screenX, screenY, building);
      return;
    }

    const level = Math.min(3, Math.max(1, building.level || 1));
    const spriteCategoryKey = `${type}_L${level}`;
    const spriteList = this.buildingSprites[spriteCategoryKey] || this.buildingSprites[`${type}_L1`];

    if (spriteList && spriteList.length > 0) {
      // Deterministically select sprite variant based on tile position
      const spriteIdx = Math.abs(Math.round(gridX * 7 + gridY * 13 + level * 3)) % spriteList.length;
      const filename = spriteList[spriteIdx];
      const img = this.images.get(filename);

      if (img && img.complete && img.naturalWidth > 0) {
        // Compute scaled width & height preserving authentic sprite aspect ratio
        let scale = 1.10;
        let yOffset = 6;

        if (type === 'RESIDENTIAL') {
          if (level === 1) { scale = 1.05; yOffset = 6; }
          else if (level === 2) { scale = 1.18; yOffset = 7; }
          else { scale = 1.30; yOffset = 8; }
        } else if (type === 'COMMERCIAL') {
          if (level === 1) { scale = 1.15; yOffset = 6; }
          else if (level === 2) { scale = 1.22; yOffset = 7; }
          else { scale = 1.40; yOffset = 8; }
        } else if (type === 'INDUSTRIAL') {
          scale = 1.25;
          yOffset = 6;
        }

        const drawWidth = this.TILE_WIDTH * scale;
        const drawHeight = (img.naturalHeight / img.naturalWidth) * drawWidth;
        const drawX = screenX - (drawWidth / 2);
        const drawY = screenY - drawHeight + yOffset;

        ctx.save();
        // Crisp pixel rendering without blurring
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Owner Color Ribbon Accent on building foundation
        ctx.fillStyle = ownerColor;
        ctx.fillRect(screenX - 8, screenY - 2, 16, 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX - 8, screenY - 2, 16, 3);

        // Strike Indicator
        if (building.isUnderStrike) {
          ctx.fillStyle = '#dc2626';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('⚠️ STRIKE', screenX - 22, drawY - 4);
        }

        // Tax Abatement Badge
        if (building.taxAbatedUntil > 0) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(screenX + 16, drawY + 8, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return;
      }
    }

    // Procedural 32-Bit Fallback while sprites load
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    ctx.save();
    ctx.translate(screenX - w / 2, screenY - h / 2);

    const bHeight = level * 20 + 12;
    const hw = w / 2;
    const hh = h / 2;

    let wallLeftColor = '#94a3b8';
    let wallRightColor = '#64748b';
    let roofColor = '#e2e8f0';
    let windowColor = '#fef08a';

    if (type === 'RESIDENTIAL') {
      roofColor = level === 1 ? '#dc2626' : (level === 2 ? '#0284c7' : '#059669');
      wallLeftColor = level === 1 ? '#cbd5e1' : (level === 2 ? '#b91c1c' : '#047857');
      wallRightColor = level === 1 ? '#94a3b8' : (level === 2 ? '#7f1d1d' : '#064e3b');
    } else if (type === 'COMMERCIAL') {
      roofColor = level === 1 ? '#2563eb' : (level === 2 ? '#1d4ed8' : '#1e1b4b');
      wallLeftColor = '#38bdf8';
      wallRightColor = '#0284c7';
      windowColor = '#67e8f9';
    } else if (type === 'INDUSTRIAL') {
      roofColor = '#b45309';
      wallLeftColor = '#78350f';
      wallRightColor = '#451a03';
      windowColor = '#f59e0b';
    }

    // 1. Left Wall
    ctx.beginPath();
    ctx.moveTo(0, hh); ctx.lineTo(hw, h); ctx.lineTo(hw, h - bHeight); ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallLeftColor; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();

    // 2. Right Wall
    ctx.beginPath();
    ctx.moveTo(hw, h); ctx.lineTo(w, hh); ctx.lineTo(w, hh - bHeight); ctx.lineTo(hw, h - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallRightColor; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();

    // 3. Roof Top
    ctx.beginPath();
    ctx.moveTo(hw, 0 - bHeight); ctx.lineTo(w, hh - bHeight); ctx.lineTo(hw, h - bHeight); ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = roofColor; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();
  }

  // Draw Ground Shadow
  drawAntigravityShadow(ctx, screenX, groundScreenY, z_offset) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const z = Math.max(0, z_offset);
    const scale = Math.max(0.35, 1.0 - (z / 160));
    const alpha = Math.max(0.15, 0.60 - (z / 200));

    ctx.save();
    ctx.translate(screenX, groundScreenY);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
    ctx.fill();
    ctx.restore();
  }

  drawFloatingArcology(ctx, screenX, screenY, arcology, ownerColor = '#3b82f6') {
    // Preserved for future sky city reactivation
  }
}

window.TileAssets = TileAssets;

