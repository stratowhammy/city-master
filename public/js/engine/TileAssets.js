// public/js/engine/TileAssets.js
// Procedural Pixel-Art Sprite & Canvas Texture Generator for 2:1 Dimetric Rendering
// Strict 2:1 Dimetric Projection (W=64, H=32), Maritime Ports, Dynamic Road Levels 1-4,
// and zero-overhead cached canvas rendering for low-end hardware & Chromebooks.

class TileAssets {
  constructor() {
    this.cache = new Map();
    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;
    this.initBaseSprites();
  }

  initBaseSprites() {
    // 1. Grass Ground Terrain
    this.createTileCanvas('ground_grass', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#2d6a4f', '#1b4332', '#40916c');
      ctx.fillStyle = '#52b788';
      ctx.fillRect(w / 2 - 4, h / 2 - 2, 2, 2);
      ctx.fillRect(w / 2 + 8, h / 2 + 1, 2, 2);
      ctx.fillRect(w / 2 - 10, h / 2 + 3, 2, 2);
    });

    // 2. Deep Ocean Water with Wave Reflections
    this.createTileCanvas('ground_water', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#0077b6', '#03045e', '#0096c7');
      // Animated water wave highlights
      ctx.strokeStyle = 'rgba(202, 240, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, h / 2 - 1);
      ctx.lineTo(w / 2 - 4, h / 2 + 2);
      ctx.moveTo(w / 2 + 2, h / 2 - 2);
      ctx.lineTo(w / 2 + 12, h / 2 + 1);
      ctx.stroke();
    });

    // 3. Concrete Urban Foundation
    this.createTileCanvas('ground_concrete', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#475569', '#1e293b', '#64748b');
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.stroke();
    });

    // 4. Road Level 1: Local 2-Lane Street (Dashed yellow centerline)
    this.createTileCanvas('road_lvl1', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#334155', '#0f172a', '#64748b');
      // Yellow center dashes
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(w / 2 - 1, h / 2 - 4, 2, 2);
      ctx.fillRect(w / 2 + 5, h / 2 - 1, 2, 2);
      ctx.fillRect(w / 2 - 7, h / 2 + 1, 2, 2);
    });

    // 5. Road Level 2: Multi-Lane Avenue (4 lanes with white lane markers and crosswalk stripes)
    this.createTileCanvas('road_lvl2', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#1e293b', '#020617', '#94a3b8');
      // Double solid center line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w / 2 - 2, h / 2 - 5, 2, 10);
      ctx.fillRect(w / 2 + 1, h / 2 - 5, 2, 10);
      // White lane dividers
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 12, h / 2 - 2, 3, 2);
      ctx.fillRect(w / 2 + 10, h / 2 - 2, 3, 2);
      // Sidewalk curbs
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(w / 2 - 20, h / 2 + 6, 40, 1.5);
    });

    // 6. Road Level 3: High-Capacity Boulevard (6 lanes, landscaped median, streetlights)
    this.createTileCanvas('road_lvl3', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#0f172a', '#020617', '#38bdf8');
      // Landscaped Green Center Median
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.stroke();

      // Street lamp posts on median
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(w / 2 - 1, h / 2 - 12, 2, 10);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 12, 3, 0, Math.PI * 2);
      ctx.fill();

      // Multi-lane markings
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w / 2 - 16, h / 2 - 3, 4, 1.5);
      ctx.fillRect(w / 2 + 12, h / 2 - 3, 4, 1.5);
    });

    // 7. Road Level 4: Heavy Commercial Arterial (Express multi-lane corridor)
    this.createTileCanvas('road_lvl4', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#020617', '#000000', '#c084fc');
      // Illuminated transit express lanes
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(w / 2 - 18, h / 2 - 5, 2, 10);
      ctx.fillRect(w / 2 + 16, h / 2 - 5, 2, 10);

      // Center divider barrier
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w / 2 - 1, h / 2 - 7, 2, 14);

      // Overhead Gantry Signage
      ctx.fillStyle = '#334155';
      ctx.fillRect(w / 2 - 18, h / 2 - 18, 36, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(w / 2 - 14, h / 2 - 17, 12, 2);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(w / 2 + 2, h / 2 - 17, 12, 2);
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

  drawIsoDiamond(ctx, w, h, fillTop, fillLeft, strokeColor) {
    const hw = w / 2;
    const hh = h / 2;

    ctx.beginPath();
    ctx.moveTo(hw, 0);
    ctx.lineTo(w, hh);
    ctx.lineTo(hw, h);
    ctx.lineTo(0, hh);
    ctx.closePath();

    ctx.fillStyle = fillTop;
    ctx.fill();

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
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
      this.drawIsoDiamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#334155', '#0f172a', '#475569');
    }
  }

  // Draw Maritime Port Hub (Container Terminal, Harbor Customs, or Drydock)
  drawMaritimePort(ctx, screenX, screenY, portBuilding) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const hw = w / 2;
    const hh = h / 2;

    ctx.save();
    ctx.translate(screenX - hw, screenY - hh);

    // Port concrete apron foundation
    this.drawIsoDiamond(ctx, w, h, '#475569', '#1e293b', '#64748b');

    // 1. Port Logistics Terminal Building (Left)
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(hw - 20, hh - 18, 16, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(hw - 18, hh - 16, 4, 4);
    ctx.fillRect(hw - 10, hh - 16, 4, 4);

    // 2. Stacked Cargo Shipping Containers
    // Blue Container
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(hw + 2, hh - 10, 14, 6);
    ctx.strokeStyle = '#1d4ed8';
    ctx.strokeRect(hw + 2, hh - 10, 14, 6);

    // Orange Container (Stacked above)
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(hw + 4, hh - 17, 12, 6);
    ctx.strokeStyle = '#c2410c';
    ctx.strokeRect(hw + 4, hh - 17, 12, 6);

    // Emerald Green Container
    ctx.fillStyle = '#059669';
    ctx.fillRect(hw - 4, hh - 8, 12, 6);

    // 3. Heavy Gantry Cargo Crane
    ctx.strokeStyle = '#dc2626'; // Bright Red Gantry
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    // Crane A-frame legs
    ctx.moveTo(hw - 10, hh + 2);
    ctx.lineTo(hw - 2, hh - 28);
    ctx.lineTo(hw + 6, hh + 2);
    // Crane boom extending over water
    ctx.moveTo(hw - 8, hh - 26);
    ctx.lineTo(hw + 22, hh - 26);
    ctx.stroke();

    // Crane Cable & Spreader Hook
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hw + 14, hh - 26);
    ctx.lineTo(hw + 14, hh - 12);
    ctx.stroke();

    // Suspended Cargo Box
    ctx.fillStyle = '#facc15';
    ctx.fillRect(hw + 10, hh - 12, 8, 5);

    ctx.restore();
  }

  // Draw Deep-Water Pier extending into the ocean with moored ship
  drawPierDock(ctx, screenX, screenY, pierBuilding) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const hw = w / 2;
    const hh = h / 2;

    ctx.save();
    ctx.translate(screenX - hw, screenY - hh);

    // Wooden/Concrete Pier Planks
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

    // Pier plank lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(hw - 10, hh - 2); ctx.lineTo(hw + 10, hh - 2);
    ctx.moveTo(hw - 8, hh + 2); ctx.lineTo(hw + 8, hh + 2);
    ctx.stroke();

    // Moored Cargo Vessel / Boat
    ctx.fillStyle = '#1e293b'; // Ship Hull
    ctx.beginPath();
    ctx.moveTo(hw + 8, hh - 8);
    ctx.lineTo(hw + 24, hh - 2);
    ctx.lineTo(hw + 18, hh + 6);
    ctx.lineTo(hw + 4, hh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // Ship Deckhouse & Smoke funnel
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(hw + 10, hh - 12, 6, 6);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(hw + 12, hh - 16, 2, 4);

    // Mooring Bollards
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(hw - 6, hh - 4, 2, 3);
    ctx.fillRect(hw + 4, hh - 4, 2, 3);

    ctx.restore();
  }

  // Draw Ground Building (Levels 1 to 3)
  drawGroundBuilding(ctx, screenX, screenY, building, ownerColor = '#3b82f6') {
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

    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const level = building.level || 1;

    ctx.save();
    ctx.translate(screenX - w / 2, screenY - h / 2);

    const bHeight = level * 18 + 12;
    const hw = w / 2;
    const hh = h / 2;

    let wallLeftColor = '#334155';
    let wallRightColor = '#1e293b';
    let roofColor = '#475569';
    let windowColor = '#fef08a';

    if (type === 'RESIDENTIAL') {
      roofColor = level === 1 ? '#e11d48' : (level === 2 ? '#0284c7' : '#059669');
      wallLeftColor = '#94a3b8';
      wallRightColor = '#64748b';
    } else if (type === 'COMMERCIAL') {
      roofColor = '#3b82f6';
      wallLeftColor = '#0284c7';
      wallRightColor = '#0369a1';
      windowColor = '#67e8f9';
    } else if (type === 'INDUSTRIAL') {
      roofColor = '#d97706';
      wallLeftColor = '#78350f';
      wallRightColor = '#451a03';
      windowColor = '#f59e0b';
    } else if (type === 'CIVIC' || type === 'PARK') {
      roofColor = '#10b981';
      wallLeftColor = '#047857';
      wallRightColor = '#065f46';
    } else if (type === 'RUINS') {
      roofColor = '#450a0a';
      wallLeftColor = '#1c1917';
      wallRightColor = '#0c0a09';
    }

    // Left Wall
    ctx.beginPath();
    ctx.moveTo(0, hh);
    ctx.lineTo(hw, h);
    ctx.lineTo(hw, h - bHeight);
    ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallLeftColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    // Right Wall
    ctx.beginPath();
    ctx.moveTo(hw, h);
    ctx.lineTo(w, hh);
    ctx.lineTo(w, hh - bHeight);
    ctx.lineTo(hw, h - bHeight);
    ctx.closePath();
    ctx.fillStyle = wallRightColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();

    // Roof Top
    ctx.beginPath();
    ctx.moveTo(hw, 0 - bHeight);
    ctx.lineTo(w, hh - bHeight);
    ctx.lineTo(hw, h - bHeight);
    ctx.lineTo(0, hh - bHeight);
    ctx.closePath();
    ctx.fillStyle = roofColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();

    // Building windows
    if (type !== 'RUINS' && level > 0) {
      ctx.fillStyle = windowColor;
      for (let f = 1; f <= level; f++) {
        const floorY = h - (f * 14);
        ctx.fillRect(hw - 18, floorY - 4, 4, 4);
        ctx.fillRect(hw - 8, floorY - 1, 4, 4);
        ctx.fillRect(hw + 4, floorY - 1, 4, 4);
        ctx.fillRect(hw + 14, floorY - 4, 4, 4);
      }
    }

    // Owner color badge
    ctx.fillStyle = ownerColor;
    ctx.fillRect(hw - 4, hh - bHeight - 3, 8, 4);

    // Industrial Smokestack
    if (type === 'INDUSTRIAL') {
      ctx.fillStyle = '#52525b';
      ctx.fillRect(hw - 10, -bHeight - 12, 6, 12);
      ctx.fillStyle = 'rgba(120, 113, 108, 0.6)';
      ctx.beginPath();
      ctx.arc(hw - 7, -bHeight - 16, 6 + Math.sin(Date.now() * 0.005) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Strike indicator
    if (building.isUnderStrike) {
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('⚠️ STRIKE', hw - 24, -bHeight - 6);
    }

    // Tax Abatement badge
    if (building.taxAbatedUntil > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(w - 6, hh - bHeight, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw Ground Shadow for floating structures
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
    ctx.fillStyle = `rgba(15, 23, 42, ${alpha.toFixed(2)})`;
    ctx.fill();
    ctx.restore();
  }

  // Draw Level 4 Floating Arcology
  drawFloatingArcology(ctx, screenX, screenY, arcology, ownerColor = '#3b82f6') {
    // Preserved for future Sky City reactivation
  }
}

window.TileAssets = TileAssets;
