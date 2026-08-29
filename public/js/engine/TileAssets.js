// public/js/engine/TileAssets.js
// Procedural Pixel-Art Sprite & Canvas Texture Generator for 2:1 Dimetric Rendering
// Optimized for Chromebooks: Reusable cached canvas sprites and zero image asset load overhead!

class TileAssets {
  constructor() {
    this.cache = new Map();
    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;
    this.initBaseSprites();
  }

  initBaseSprites() {
    // Pre-bake all static isometric tiles to offscreen canvases
    this.createTileCanvas('ground_grass', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#2d6a4f', '#1b4332', '#40916c');
      // Subtle grass texture dots
      ctx.fillStyle = '#52b788';
      ctx.fillRect(w / 2 - 4, h / 2 - 2, 2, 2);
      ctx.fillRect(w / 2 + 8, h / 2 + 1, 2, 2);
      ctx.fillRect(w / 2 - 10, h / 2 + 3, 2, 2);
    });

    this.createTileCanvas('ground_water', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#0077b6', '#03045e', '#0096c7');
      // Water wave reflection lines
      ctx.strokeStyle = 'rgba(202, 240, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 12, h / 2);
      ctx.lineTo(w / 2 - 2, h / 2 + 2);
      ctx.moveTo(w / 2 + 4, h / 2 - 2);
      ctx.lineTo(w / 2 + 14, h / 2);
      ctx.stroke();
    });

    this.createTileCanvas('ground_concrete', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#475569', '#1e293b', '#64748b');
      // Grid lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
      ctx.stroke();
    });

    this.createTileCanvas('ground_road', (ctx, w, h) => {
      this.drawIsoDiamond(ctx, w, h, '#334155', '#0f172a', '#475569');
      // Road yellow center dashes
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(w / 2 - 1, h / 2 - 3, 3, 2);
      ctx.fillRect(w / 2 + 6, h / 2, 3, 2);
      ctx.fillRect(w / 2 - 8, h / 2, 3, 2);
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

  // Draw ground building (Levels 1 to 3)
  drawGroundBuilding(ctx, screenX, screenY, building, ownerColor = '#3b82f6') {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const level = building.level || 1;
    const type = building.type;

    ctx.save();
    ctx.translate(screenX - w / 2, screenY - h / 2);

    const bHeight = level * 18 + 12; // Height of building block
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
        // Left side windows
        ctx.fillRect(hw - 18, floorY - 4, 4, 4);
        ctx.fillRect(hw - 8, floorY - 1, 4, 4);
        // Right side windows
        ctx.fillRect(hw + 4, floorY - 1, 4, 4);
        ctx.fillRect(hw + 14, floorY - 4, 4, 4);
      }
    }

    // Owner color roof accent badge
    ctx.fillStyle = ownerColor;
    ctx.fillRect(hw - 4, hh - bHeight - 3, 8, 4);

    // Industrial Smokestack or Smog
    if (type === 'INDUSTRIAL') {
      ctx.fillStyle = '#52525b';
      ctx.fillRect(hw - 10, -bHeight - 12, 6, 12);
      ctx.fillStyle = 'rgba(120, 113, 108, 0.6)';
      ctx.beginPath();
      ctx.arc(hw - 7, -bHeight - 16, 6 + Math.sin(Date.now() * 0.005) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Strike picket line indicator
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

  // Draw Dynamic Ground Shadow for floating structures
  // Shadow opacity and scale are inversely proportional to z_offset (page 2)
  drawAntigravityShadow(ctx, screenX, groundScreenY, z_offset) {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const z = Math.max(0, z_offset);

    // Inverse scaling & opacity formulas
    const scale = Math.max(0.35, 1.0 - (z / 160));
    const alpha = Math.max(0.15, 0.60 - (z / 200));

    ctx.save();
    ctx.translate(screenX, groundScreenY);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15, 23, 42, ${alpha.toFixed(2)})`;
    ctx.filter = `blur(${Math.min(6, Math.max(1, z * 0.08))}px)`;
    ctx.fill();
    ctx.filter = 'none';

    ctx.restore();
  }

  // Draw Level 4 Floating Antigravity Arcology
  drawFloatingArcology(ctx, screenX, screenY, arcology, ownerColor = '#3b82f6') {
    const w = this.TILE_WIDTH;
    const h = this.TILE_HEIGHT;
    const hw = w / 2;
    const hh = h / 2;
    const height = 48;

    ctx.save();
    ctx.translate(screenX - hw, screenY - hh);

    // 1. Antigravity Levitation Field Glow / Thruster Pulse
    const pulse = Math.sin(Date.now() * 0.008) * 4;
    const grad = ctx.createLinearGradient(hw, h, hw, h + 24);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(hw - 14, h - 10);
    ctx.lineTo(hw + 14, h - 10);
    ctx.lineTo(hw + 22 + pulse, h + 22);
    ctx.lineTo(hw - 22 - pulse, h + 22);
    ctx.closePath();
    ctx.fill();

    // 2. Main Arcology Crystal Tower (Diamond Geometry)
    // Bottom pyramidal cone
    ctx.beginPath();
    ctx.moveTo(hw, h - 8);
    ctx.lineTo(0, hh - 16);
    ctx.lineTo(hw, 0 - height);
    ctx.lineTo(w, hh - 16);
    ctx.closePath();
    ctx.fillStyle = '#0284c7';
    ctx.fill();

    // Left Facet (Light cyan glass)
    ctx.beginPath();
    ctx.moveTo(0, hh - 16);
    ctx.lineTo(hw, h - 8);
    ctx.lineTo(hw, 0 - height);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();

    // Right Facet (Deep indigo glass)
    ctx.beginPath();
    ctx.moveTo(hw, h - 8);
    ctx.lineTo(w, hh - 16);
    ctx.lineTo(hw, 0 - height);
    ctx.closePath();
    ctx.fillStyle = '#0369a1';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();

    // 3. Rotating Energy Rings (Antigravity Stabilizer Rings)
    const ringAngle = (Date.now() * 0.003) % (Math.PI * 2);
    ctx.save();
    ctx.translate(hw, hh - 24);
    ctx.rotate(0.2);

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 8, ringAngle, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -12, 20, 6, -ringAngle, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Glowing Apex Beacon & Owner Emblem
    ctx.fillStyle = ownerColor;
    ctx.beginPath();
    ctx.arc(hw, -height - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Stability Warning Aura if low stability
    if (arcology.stability < 50) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hw, hh - 20, 32 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`⚡ ${arcology.stability}%`, hw - 16, -height - 8);
    }

    ctx.restore();
  }
}

// Export singleton or global class
window.TileAssets = TileAssets;
