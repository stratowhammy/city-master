// public/js/engine/TileAssets.js
// Authentic SimCity 2000 Isometric Sprite & Graphics Engine for 2:1 Dimetric Projection
// Utilizes authentic SC2000 sprite sheets for Terrain, Residential, Commercial, Industrial, Ports & Civics.

class TileAssets {
  constructor() {
    this.cache = new Map();
    this.images = new Map();
    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;

    // Sprite Sheet File Paths from /sc2000
    this.sheetPaths = {
      TERRAIN: '/sc2000/95015.png',
      RESIDENTIAL: '/sc2000/95013.png',
      COMMERCIAL: '/sc2000/95007.png',
      INDUSTRIAL: '/sc2000/95009.png',
      PORT: '/sc2000/95011.png',
      CIVIC: '/sc2000/95014.png',
      SPECIAL: '/sc2000/64181.png'
    };

    // Authentic SimCity 2000 Sprite Definitions (Coordinates on respective sheets)
    this.sprites = {
      TERRAIN_GRASS: [
        { sheet: 'TERRAIN', sx: 352, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 392, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 432, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 472, sy: 15, sw: 32, sh: 17 }
      ],
      TERRAIN_WATER: [
        { sheet: 'TERRAIN', sx: 536, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 576, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 616, sy: 15, sw: 32, sh: 17 },
        { sheet: 'TERRAIN', sx: 656, sy: 15, sw: 32, sh: 17 }
      ],
      TERRAIN_CONCRETE: [
        { sheet: 'TERRAIN', sx: 48, sy: 11, sw: 32, sh: 29 },
        { sheet: 'TERRAIN', sx: 88, sy: 11, sw: 32, sh: 29 }
      ],
      RESIDENTIAL_L1: [
        { sheet: 'RESIDENTIAL', sx: 304, sy: 22, sw: 32, sh: 18 },
        { sheet: 'RESIDENTIAL', sx: 344, sy: 22, sw: 32, sh: 18 },
        { sheet: 'RESIDENTIAL', sx: 384, sy: 22, sw: 32, sh: 18 },
        { sheet: 'RESIDENTIAL', sx: 304, sy: 55, sw: 32, sh: 17 },
        { sheet: 'RESIDENTIAL', sx: 344, sy: 55, sw: 32, sh: 17 },
        { sheet: 'RESIDENTIAL', sx: 384, sy: 55, sw: 32, sh: 17 },
        { sheet: 'RESIDENTIAL', sx: 304, sy: 87, sw: 32, sh: 17 },
        { sheet: 'RESIDENTIAL', sx: 344, sy: 87, sw: 32, sh: 17 },
        { sheet: 'RESIDENTIAL', sx: 384, sy: 116, sw: 32, sh: 20 },
        { sheet: 'RESIDENTIAL', sx: 304, sy: 117, sw: 32, sh: 19 },
        { sheet: 'RESIDENTIAL', sx: 344, sy: 117, sw: 32, sh: 19 },
        { sheet: 'RESIDENTIAL', sx: 304, sy: 147, sw: 32, sh: 21 }
      ],
      RESIDENTIAL_L2: [
        { sheet: 'RESIDENTIAL', sx: 8, sy: 46, sw: 64, sh: 34 },
        { sheet: 'RESIDENTIAL', sx: 80, sy: 41, sw: 64, sh: 39 },
        { sheet: 'RESIDENTIAL', sx: 152, sy: 44, sw: 64, sh: 36 },
        { sheet: 'RESIDENTIAL', sx: 224, sy: 36, sw: 64, sh: 44 },
        { sheet: 'RESIDENTIAL', sx: 8, sy: 115, sw: 64, sh: 53 },
        { sheet: 'RESIDENTIAL', sx: 80, sy: 112, sw: 64, sh: 56 },
        { sheet: 'RESIDENTIAL', sx: 152, sy: 90, sw: 64, sh: 78 },
        { sheet: 'RESIDENTIAL', sx: 224, sy: 91, sw: 64, sh: 77 }
      ],
      RESIDENTIAL_L3: [
        { sheet: 'RESIDENTIAL', sx: 8, sy: 195, sw: 96, sh: 77 },
        { sheet: 'RESIDENTIAL', sx: 112, sy: 184, sw: 96, sh: 88 },
        { sheet: 'RESIDENTIAL', sx: 216, sy: 214, sw: 96, sh: 58 },
        { sheet: 'RESIDENTIAL', sx: 320, sy: 176, sw: 96, sh: 96 }
      ],
      COMMERCIAL_L1: [
        { sheet: 'COMMERCIAL', sx: 8, sy: 105, sw: 32, sh: 23 },
        { sheet: 'COMMERCIAL', sx: 48, sy: 101, sw: 32, sh: 27 },
        { sheet: 'COMMERCIAL', sx: 88, sy: 108, sw: 32, sh: 20 },
        { sheet: 'COMMERCIAL', sx: 128, sy: 110, sw: 32, sh: 18 },
        { sheet: 'COMMERCIAL', sx: 168, sy: 96, sw: 32, sh: 32 },
        { sheet: 'COMMERCIAL', sx: 208, sy: 85, sw: 32, sh: 43 },
        { sheet: 'COMMERCIAL', sx: 248, sy: 103, sw: 32, sh: 25 },
        { sheet: 'COMMERCIAL', sx: 288, sy: 94, sw: 32, sh: 34 }
      ],
      COMMERCIAL_L2: [
        { sheet: 'COMMERCIAL', sx: 8, sy: 138, sw: 64, sh: 46 },
        { sheet: 'COMMERCIAL', sx: 72, sy: 147, sw: 64, sh: 37 },
        { sheet: 'COMMERCIAL', sx: 144, sy: 147, sw: 64, sh: 37 },
        { sheet: 'COMMERCIAL', sx: 224, sy: 142, sw: 64, sh: 42 },
        { sheet: 'COMMERCIAL', sx: 296, sy: 139, sw: 64, sh: 46 },
        { sheet: 'COMMERCIAL', sx: 8, sy: 227, sw: 64, sh: 53 },
        { sheet: 'COMMERCIAL', sx: 76, sy: 205, sw: 64, sh: 75 },
        { sheet: 'COMMERCIAL', sx: 144, sy: 213, sw: 64, sh: 67 },
        { sheet: 'COMMERCIAL', sx: 216, sy: 205, sw: 64, sh: 75 },
        { sheet: 'COMMERCIAL', sx: 288, sy: 197, sw: 64, sh: 83 }
      ],
      COMMERCIAL_L3: [
        { sheet: 'COMMERCIAL', sx: 424, sy: 67, sw: 96, sh: 61 },
        { sheet: 'COMMERCIAL', sx: 528, sy: 37, sw: 96, sh: 91 },
        { sheet: 'COMMERCIAL', sx: 632, sy: 63, sw: 96, sh: 65 },
        { sheet: 'COMMERCIAL', sx: 736, sy: 11, sw: 96, sh: 117 },
        { sheet: 'COMMERCIAL', sx: 424, sy: 149, sw: 96, sh: 115 },
        { sheet: 'COMMERCIAL', sx: 528, sy: 181, sw: 96, sh: 83 },
        { sheet: 'COMMERCIAL', sx: 632, sy: 157, sw: 96, sh: 107 },
        { sheet: 'COMMERCIAL', sx: 736, sy: 141, sw: 96, sh: 123 }
      ],
      INDUSTRIAL_L1: [
        { sheet: 'INDUSTRIAL', sx: 8, sy: 13, sw: 64, sh: 43 },
        { sheet: 'INDUSTRIAL', sx: 80, sy: 13, sw: 64, sh: 43 },
        { sheet: 'INDUSTRIAL', sx: 664, sy: 113, sw: 64, sh: 39 },
        { sheet: 'INDUSTRIAL', sx: 736, sy: 113, sw: 64, sh: 39 }
      ],
      INDUSTRIAL_L2: [
        { sheet: 'INDUSTRIAL', sx: 8, sy: 70, sw: 64, sh: 42 },
        { sheet: 'INDUSTRIAL', sx: 80, sy: 70, sw: 64, sh: 42 },
        { sheet: 'INDUSTRIAL', sx: 8, sy: 185, sw: 64, sh: 45 },
        { sheet: 'INDUSTRIAL', sx: 8, sy: 300, sw: 96, sh: 60 }
      ],
      INDUSTRIAL_L3: [
        { sheet: 'INDUSTRIAL', sx: 664, sy: 165, sw: 96, sh: 51 },
        { sheet: 'INDUSTRIAL', sx: 768, sy: 165, sw: 96, sh: 51 }
      ],
      PORT: [
        { sheet: 'PORT', sx: 8, sy: 8, sw: 32, sh: 40 },
        { sheet: 'PORT', sx: 192, sy: 232, sw: 64, sh: 40 },
        { sheet: 'PORT', sx: 16, sy: 216, sw: 64, sh: 56 }
      ],
      PIER: [
        { sheet: 'PORT', sx: 48, sy: 27, sw: 32, sh: 21 }
      ],
      CIVIC: [
        { sheet: 'CIVIC', sx: 8, sy: 224, sw: 64, sh: 48 },
        { sheet: 'CIVIC', sx: 72, sy: 224, sw: 64, sh: 48 },
        { sheet: 'CIVIC', sx: 136, sy: 224, sw: 64, sh: 48 },
        { sheet: 'CIVIC', sx: 200, sy: 224, sw: 64, sh: 48 },
        { sheet: 'CIVIC', sx: 192, sy: 384, sw: 64, sh: 48 }
      ]
    };

    this.preloadSheets();
    this.initBaseSprites();
  }

  preloadSheets() {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return;
    Object.entries(this.sheetPaths).forEach(([key, url]) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.images.set(key, img);
      };
    });
  }

  initBaseSprites() {
    // 1. SimCity 2000 Style Procedural Fallback Terrain
    this.createTileCanvas('ground_grass', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#43833b', '#2d5e27', '#4d9944', '#70bf67');
      // Dithered pixels
      ctx.fillStyle = '#70bf67';
      ctx.fillRect(w / 2 - 8, h / 2 - 4, 2, 2);
      ctx.fillRect(w / 2 + 10, h / 2 - 2, 2, 2);
      ctx.fillRect(w / 2 - 14, h / 2 + 2, 2, 2);
      ctx.fillStyle = '#2d5e27';
      ctx.fillRect(w / 2 - 4, h / 2 + 5, 2, 2);
      ctx.fillRect(w / 2 + 8, h / 2 + 4, 2, 2);
    });

    // 2. SimCity 2000 Deep Blue Water
    this.createTileCanvas('ground_water', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#0000d8', '#0000a0', '#0038ff', '#5490ff');
      // Animated water shimmer
      ctx.fillStyle = '#99ccff';
      ctx.fillRect(w / 2 - 12, h / 2 - 3, 6, 2);
      ctx.fillRect(w / 2 + 4, h / 2 + 3, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 10, h / 2 - 3, 2, 2);
    });

    // 3. SimCity 2000 Concrete Urban Foundation
    this.createTileCanvas('ground_concrete', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#808080', '#5a5a5a', '#9e9e9e', '#b8b8b8');
      ctx.strokeStyle = '#404040';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
      ctx.stroke();
    });

    // 4. SimCity 2000 Road Level 1 (Local 2-Lane Street)
    this.createTileCanvas('road_lvl1', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#303030', '#1c1c1c', '#404040', '#6e6e6e');
      // Yellow dashed center divider
      ctx.fillStyle = '#facc15';
      ctx.fillRect(w / 2 - 2, h / 2 - 5, 4, 2);
      ctx.fillRect(w / 2 + 6, h / 2 - 1, 4, 2);
      ctx.fillRect(w / 2 - 10, h / 2 + 1, 4, 2);
    });

    // 5. SimCity 2000 Road Level 2 (Multi-Lane Avenue)
    this.createTileCanvas('road_lvl2', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#242424', '#141414', '#383838', '#585858');
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w / 2 - 2, h / 2 - 6, 2, 12);
      ctx.fillRect(w / 2 + 1, h / 2 - 6, 2, 12);
      // White zebra crosswalks
      ctx.fillStyle = '#ffffff';
      for (let i = -14; i <= 14; i += 7) {
        ctx.fillRect(w / 2 + i, h / 2 - 9, 3, 2);
        ctx.fillRect(w / 2 + i, h / 2 + 7, 3, 2);
      }
    });

    // 6. SimCity 2000 Road Level 3 (Boulevard with Landscaped Median)
    this.createTileCanvas('road_lvl3', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#181818', '#0c0c0c', '#2c2c2c', '#484848');
      // Green Center Median
      ctx.fillStyle = '#2d5e27';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#70bf67';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Pixel trees
      ctx.fillStyle = '#43833b';
      ctx.beginPath();
      ctx.arc(w / 2 - 5, h / 2 - 2, 3, 0, Math.PI * 2);
      ctx.arc(w / 2 + 5, h / 2 + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. SimCity 2000 Road Level 4 (Highway / Expressway)
    this.createTileCanvas('road_lvl4', (ctx, w, h) => {
      this.drawSC2000Diamond(ctx, w, h, '#101010', '#000000', '#202020', '#a855f7');
      // Cyan transit lane
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(w / 2 - 18, h / 2 - 5, 3, 10);
      ctx.fillRect(w / 2 + 15, h / 2 - 5, 3, 10);
      // Concrete divider
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(w / 2 - 2, h / 2 - 7, 4, 14);
      // Overhead gantry
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(w / 2 - 20, h / 2 - 18, 40, 3);
      ctx.fillRect(w / 2 - 20, h / 2 - 18, 3, 16);
      ctx.fillRect(w / 2 + 17, h / 2 - 18, 3, 16);
    });
  }

  createTileCanvas(key, drawFn, width = this.TILE_WIDTH, height = this.TILE_HEIGHT) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, width, height);
    this.cache.set(key, canvas);
    return canvas;
  }

  // Authentic SimCity 2000 Beveled Isometric Diamond
  drawSC2000Diamond(ctx, w, h, fillTop, fillLeft, fillRight, strokeHighlight) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(w - 1, hh);
    ctx.lineTo(hw, h - 1);
    ctx.lineTo(0, hh);
    ctx.closePath();
    ctx.fillStyle = fillTop;
    ctx.fill();

    // Top-left highlight
    ctx.strokeStyle = strokeHighlight || 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hh); ctx.lineTo(hw, 0); ctx.lineTo(w - 1, hh);
    ctx.stroke();

    // Bottom-right shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 1, hh); ctx.lineTo(hw, h - 1); ctx.lineTo(0, hh);
    ctx.stroke();
  }

  // Draw SimCity 2000 Terrain Tile (Grass, Water, Concrete)
  drawTerrain(ctx, screenX, screenY, tile, gridX = 0, gridY = 0) {
    const terrainImg = this.images.get('TERRAIN');
    let spriteList = null;

    if (tile.isWater) {
      spriteList = this.sprites.TERRAIN_WATER;
    } else if (tile.zoning === 'COMMERCIAL' || tile.zoning === 'INDUSTRIAL') {
      spriteList = this.sprites.TERRAIN_CONCRETE;
    } else {
      spriteList = this.sprites.TERRAIN_GRASS;
    }

    if (terrainImg && terrainImg.complete && spriteList && spriteList.length > 0) {
      const idx = Math.abs(gridX * 7 + gridY * 13) % spriteList.length;
      const sp = spriteList[idx];

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // 2.0x scale matches SC2000 32x16 tile to our 64x32 tile diamond
      ctx.drawImage(
        terrainImg,
        sp.sx, sp.sy, sp.sw, sp.sh,
        screenX - this.TILE_WIDTH / 2, screenY,
        this.TILE_WIDTH, this.TILE_HEIGHT + 2
      );
      ctx.restore();
      return;
    }

    // Procedural fallback
    let key = 'ground_grass';
    if (tile.isWater) key = 'ground_water';
    else if (tile.zoning === 'COMMERCIAL' || tile.zoning === 'INDUSTRIAL') key = 'ground_concrete';

    const sprite = this.cache.get(key);
    if (sprite) {
      ctx.drawImage(sprite, screenX - this.TILE_WIDTH / 2, screenY);
    } else {
      this.drawSC2000Diamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#43833b', '#2d5e27', '#4d9944', '#70bf67');
    }
  }

  // Draw SimCity 2000 Road Tile
  drawRoadTile(ctx, screenX, screenY, roadLevel = 1) {
    let key = 'road_lvl1';
    if (roadLevel === 2) key = 'road_lvl2';
    else if (roadLevel === 3) key = 'road_lvl3';
    else if (roadLevel >= 4) key = 'road_lvl4';

    const sprite = this.cache.get(key);
    if (sprite) {
      ctx.drawImage(sprite, screenX - this.TILE_WIDTH / 2, screenY);
    } else {
      this.drawSC2000Diamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#303030', '#1c1c1c', '#404040', '#6e6e6e');
    }
  }

  // Draw Ground Building using authentic SimCity 2000 sprite sheets
  drawGroundBuilding(ctx, screenX, screenY, building, ownerColor = '#3b82f6', gridX = 0, gridY = 0) {
    const type = building.type;
    if (type === 'ROAD') {
      this.drawRoadTile(ctx, screenX, screenY, building.level || 1);
      return;
    }

    const level = Math.min(3, Math.max(1, building.level || 1));
    let spriteCategoryKey = `${type}_L${level}`;
    if (type === 'PORT') spriteCategoryKey = 'PORT';
    else if (type === 'PIER') spriteCategoryKey = 'PIER';
    else if (type === 'CIVIC' || type === 'PARK') spriteCategoryKey = 'CIVIC';

    const spriteList = this.sprites[spriteCategoryKey] || this.sprites[`${type}_L1`] || this.sprites.RESIDENTIAL_L1;

    if (spriteList && spriteList.length > 0) {
      const spriteIdx = Math.abs(Math.round(gridX * 7 + gridY * 13 + level * 3)) % spriteList.length;
      const sp = spriteList[spriteIdx];
      const sheetImg = this.images.get(sp.sheet);

      if (sheetImg && sheetImg.complete && sheetImg.naturalWidth > 0) {
        // SimCity 2000 2.0x integer scale factor
        const drawWidth = sp.sw * 2.0;
        const drawHeight = sp.sh * 2.0;
        const drawX = screenX - (drawWidth / 2);
        // Anchor building base to bottom vertex of ground tile
        const drawY = (screenY + this.TILE_HEIGHT) - drawHeight;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sheetImg,
          sp.sx, sp.sy, sp.sw, sp.sh,
          drawX, drawY, drawWidth, drawHeight
        );

        // Corporate Owner Color Accent Ribbon on building foundation
        ctx.fillStyle = ownerColor;
        ctx.fillRect(screenX - 8, screenY + this.TILE_HEIGHT - 4, 16, 3);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX - 8, screenY + this.TILE_HEIGHT - 4, 16, 3);

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

    // Procedural Fallback while sprite sheets are loading
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    ctx.save();
    ctx.translate(screenX - w / 2, screenY);

    const bHeight = level * 18 + 10;
    const hw = w / 2;
    const hh = h / 2;

    let wallLeftColor = '#808080';
    let wallRightColor = '#505050';
    let roofColor = '#a0a0a0';

    if (type === 'RESIDENTIAL') {
      roofColor = level === 1 ? '#c0392b' : (level === 2 ? '#2980b9' : '#27ae60');
      wallLeftColor = '#bdc3c7';
      wallRightColor = '#7f8c8d';
    } else if (type === 'COMMERCIAL') {
      roofColor = level === 1 ? '#3498db' : (level === 2 ? '#2c3e50' : '#1a252f');
      wallLeftColor = '#ecf0f1';
      wallRightColor = '#95a5a6';
    } else if (type === 'INDUSTRIAL') {
      roofColor = '#d35400';
      wallLeftColor = '#7f8c8d';
      wallRightColor = '#34495e';
    } else if (type === 'PORT') {
      roofColor = '#e67e22';
      wallLeftColor = '#95a5a6';
      wallRightColor = '#7f8c8d';
    }

    // Left Wall
    ctx.beginPath();
    ctx.moveTo(0, hh); ctx.lineTo(hw, h); ctx.lineTo(hw, h - bHeight); ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallLeftColor; ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke();

    // Right Wall
    ctx.beginPath();
    ctx.moveTo(hw, h); ctx.lineTo(w, hh); ctx.lineTo(w, hh - bHeight); ctx.lineTo(hw, h - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallRightColor; ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke();

    // Roof Top
    ctx.beginPath();
    ctx.moveTo(hw, 0 - bHeight); ctx.lineTo(w, hh - bHeight); ctx.lineTo(hw, h - bHeight); ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = roofColor; ctx.fill();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1; ctx.stroke();

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
}

window.TileAssets = TileAssets;

