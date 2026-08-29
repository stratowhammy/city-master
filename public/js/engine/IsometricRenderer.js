// public/js/engine/IsometricRenderer.js
// 2:1 Dimetric Isometric Renderer with Enhanced Overlays (Pollution, Land Value, Unowned Land)

class IsometricRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;

    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;

    this.camera = { x: 0, y: -480, zoom: 0.85 };
    this.overlayMode = 'NORMAL'; // 'NORMAL', 'UNOWNED', 'POLLUTION', 'LAND_VALUE', 'ZONING', 'DISTRICTS'
    
    // Feature Flag: Sky Cities disabled (preserved for future reactivation)
    this.ENABLE_SKY_CITIES = false;

    this.hoveredTile = null;
    this.selectedTile = null;
    this.activeTool = 'INSPECT';

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  initCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Convert Grid (x, y, z) -> Screen Coordinates
  gridToScreen(gx, gy, gz = 0) {
    const screenX = (gx - gy) * (this.TILE_WIDTH / 2);
    const screenY = (gx + gy) * (this.TILE_HEIGHT / 2) - gz;
    return { x: screenX, y: screenY };
  }

  // Convert Screen (px, py) -> Grid Coordinates
  screenToGrid(sx, sy) {
    const worldX = (sx - this.canvas.width / 2) / this.camera.zoom - this.camera.x;
    const worldY = (sy - this.canvas.height / 2) / this.camera.zoom - this.camera.y;

    const gx = (worldX / (this.TILE_WIDTH / 2) + worldY / (this.TILE_HEIGHT / 2)) / 2;
    const gy = (worldY / (this.TILE_HEIGHT / 2) - worldX / (this.TILE_WIDTH / 2)) / 2;

    return { x: Math.floor(gx), y: Math.floor(gy) };
  }

  render(gameState, localPlayerFirmId) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // Clear Screen (Futuristic Dark Cyberpunk Horizon)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Camera Transform (Center + Zoom)
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(this.camera.x, this.camera.y);

    const gridSize = gameState.gridSize || 60;
    const floatingDrawQueue = [];

    // 1. Render Grid Tiles in Isometric Painter's Order (sum = x + y)
    for (let sum = 0; sum <= (gridSize - 1) * 2; sum++) {
      for (let x = 0; x <= sum; x++) {
        const y = sum - x;
        if (x >= gridSize || y >= gridSize || y < 0) continue;

        const tile = gameState.grid[x] && gameState.grid[x][y];
        if (!tile) continue;

        const screenPos = this.gridToScreen(x, y, 0);

        // A. Base Ground Terrain
        let terrainKey = 'ground_grass';
        if (tile.isWater) terrainKey = 'ground_water';
        else if (tile.zoning === 'COMMERCIAL' || tile.zoning === 'INDUSTRIAL') terrainKey = 'ground_concrete';
        else if (tile.groundBuilding && tile.groundBuilding.type === 'TRANSIT') terrainKey = 'ground_road';

        const terrainSprite = this.assets.cache.get(terrainKey);
        if (terrainSprite) {
          ctx.drawImage(terrainSprite, screenPos.x - this.TILE_WIDTH / 2, screenPos.y);
        } else {
          this.assets.drawIsoDiamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#2d6a4f', '#1b4332', '#40916c');
        }

        // B. Ownership Borders & Unpurchased Land Identifiers
        this.renderOwnershipBorders(ctx, tile, screenPos, localPlayerFirmId, gameState);

        // C. Layer Overlays (Pollution AoE, Land Value Heatmap, For Sale, Zoning, Districts)
        this.renderTileOverlay(ctx, tile, screenPos, localPlayerFirmId, gameState);

        // D. Antigravity Shadow (if floating building exists above)
        if (this.ENABLE_SKY_CITIES && tile.floatingBuilding) {
          const curZ = tile.floatingBuilding.current_z || tile.floatingBuilding.z_offset || 64;
          this.assets.drawAntigravityShadow(ctx, screenPos.x, screenPos.y + this.TILE_HEIGHT / 2, curZ);
          floatingDrawQueue.push({ tile, x, y, screenPos });
        }

        // E. Ground Building (Level 1..3)
        if (tile.groundBuilding) {
          const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
          const ownerColor = firm ? firm.color : '#3b82f6';
          this.assets.drawGroundBuilding(ctx, screenPos.x, screenPos.y + this.TILE_HEIGHT / 2, tile.groundBuilding, ownerColor);
        }

        // F. Highlight Hovered / Selected Tile
        if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.0;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

          // Hover tag for unpurchased land
          if (!tile.ownerId) {
            this.drawTileBadge(ctx, screenPos.x, screenPos.y, `🏷️ FOR SALE: $${tile.landValue.toLocaleString()}`, '#10b981', '#ffffff');
          }
        }

        if (this.selectedTile && this.selectedTile.x === x && this.selectedTile.y === y) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        }
      }
    }

    // 2. Render Floating Antigravity Arcologies (Z-Axis Layer)
    if (this.ENABLE_SKY_CITIES) {
      for (const item of floatingDrawQueue) {
        const { tile, screenPos } = item;
        const arcology = tile.floatingBuilding;
        const curZ = arcology.current_z || arcology.z_offset || 64;
        const floatingScreenY = screenPos.y + (this.TILE_HEIGHT / 2) - curZ;
        const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
        const ownerColor = firm ? firm.color : '#38bdf8';

        this.assets.drawFloatingArcology(ctx, screenPos.x, floatingScreenY, arcology, ownerColor);
      }

      // 3. Render Floating Transit Lines ONLY when Antigravity Overlay is active
      if (this.overlayMode === 'ANTIGRAVITY') {
        this.renderFlyingTransit(ctx, gameState);
      }
    }

    ctx.restore();
  }

  // Draw tile diamond border
  strokeTileDiamond(ctx, screenX, screenY) {
    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + hw, screenY + hh);
    ctx.lineTo(screenX, screenY + this.TILE_HEIGHT);
    ctx.lineTo(screenX - hw, screenY + hh);
    ctx.closePath();
    ctx.stroke();
  }

  // Fill tile diamond
  fillTileDiamond(ctx, screenX, screenY) {
    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + hw, screenY + hh);
    ctx.lineTo(screenX, screenY + this.TILE_HEIGHT);
    ctx.lineTo(screenX - hw, screenY + hh);
    ctx.closePath();
    ctx.fill();
  }

  // Draw pill text badge on tile
  drawTileBadge(ctx, screenX, screenY, text, bgColor = '#0f172a', textColor = '#ffffff') {
    ctx.save();
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 4;
    const badgeHeight = 13;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeX = screenX - badgeWidth / 2;
    const badgeY = screenY + (this.TILE_HEIGHT / 2) - badgeHeight / 2;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, screenX, badgeY + badgeHeight / 2);
    ctx.restore();
  }

  // Render distinct borders for Owned vs Unpurchased squares
  renderOwnershipBorders(ctx, tile, screenPos, localPlayerFirmId, gameState) {
    ctx.save();

    if (!tile.ownerId) {
      // UNPURCHASED SQUARE IDENTIFIER
      if (this.overlayMode === 'NORMAL' || this.overlayMode === 'UNOWNED') {
        // Subtle dotted white outline for unpurchased land
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        ctx.setLineDash([]);
      }
    } else {
      // OWNED SQUARE IDENTIFIER
      const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
      const ownerColor = firm ? firm.color : '#38bdf8';
      const isMine = (tile.ownerId === localPlayerFirmId);

      if (isMine) {
        // Player's own land: Glowing double cyan border
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.0;
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
      } else {
        // Competitor firm land: Solid firm-colored border
        ctx.strokeStyle = ownerColor;
        ctx.lineWidth = 1.5;
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
      }
    }

    ctx.restore();
  }

  // Main Map Overlays (Pollution, Land Value, For Sale, Zoning, Districts)
  renderTileOverlay(ctx, tile, screenPos, localPlayerFirmId, gameState) {
    if (this.overlayMode === 'NORMAL') return;

    ctx.save();

    // 1. FOR SALE (UNPURCHASED LAND VIEW)
    if (this.overlayMode === 'UNOWNED') {
      if (!tile.ownerId) {
        // Highlight unpurchased land in bright emerald green with price tag
        ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

        if (this.camera.zoom >= 0.7) {
          this.drawTileBadge(ctx, screenPos.x, screenPos.y, `$${tile.landValue.toLocaleString()}`, '#064e3b', '#6ee7b7');
        }
      } else {
        // Owned land is dimmed
        const isMine = (tile.ownerId === localPlayerFirmId);
        ctx.fillStyle = isMine ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.65)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      }
    }

    // 2. POLLUTION (DIRTY SMOKE HEATMAP VIEW)
    else if (this.overlayMode === 'POLLUTION') {
      const pol = tile.pollution || 0;
      if (pol === 0) {
        // Clean air (Fresh soft green)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else if (pol <= 25) {
        // Light haze (Yellow)
        ctx.fillStyle = 'rgba(234, 179, 8, 0.50)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else if (pol <= 60) {
        // Moderate smoke (Orange/Red)
        ctx.fillStyle = 'rgba(249, 115, 22, 0.70)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else {
        // Heavy toxic smoke (Crimson/Purple)
        ctx.fillStyle = 'rgba(225, 29, 72, 0.85)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      }

      ctx.strokeStyle = pol > 30 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1;
      this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

      // Render smoke badge on each tile
      if (this.camera.zoom >= 0.65) {
        const badgeBg = pol > 50 ? '#881337' : (pol > 20 ? '#78350f' : '#064e3b');
        const badgeText = pol > 0 ? `🌫️ ${pol}%` : '🌿 Clean';
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, badgeText, badgeBg, '#ffffff');
      }
    }

    // 3. LAND VALUE & DESIRABILITY HEATMAP VIEW
    else if (this.overlayMode === 'LAND_VALUE') {
      const val = tile.landValue || 5000;
      let fillColor = 'rgba(234, 179, 8, 0.5)'; // default yellow
      let badgeBg = '#78350f';
      let tag = `$${val.toLocaleString()}`;

      if (val < 2500) {
        // Depressed land value (Red)
        fillColor = 'rgba(239, 68, 68, 0.65)';
        badgeBg = '#7f1d1d';
        tag = `🔻 $${val.toLocaleString()}`;
      } else if (val < 6000) {
        // Normal land value (Yellow/Amber)
        fillColor = 'rgba(234, 179, 8, 0.50)';
        badgeBg = '#78350f';
      } else if (val < 12000) {
        // High land value near parks/stores (Green)
        fillColor = 'rgba(34, 197, 94, 0.65)';
        badgeBg = '#064e3b';
        tag = `⭐ $${val.toLocaleString()}`;
      } else {
        // Prime luxury real estate (Sparkling Gold)
        fillColor = 'rgba(250, 204, 21, 0.85)';
        badgeBg = '#713f12';
        tag = `💎 $${val.toLocaleString()}`;
      }

      ctx.fillStyle = fillColor;
      this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

      // Render value badge on tile
      if (this.camera.zoom >= 0.65) {
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, tag, badgeBg, '#ffffff');
      }
    }

    // 4. ZONING VIEW (Residential, Commercial, Industrial, Civic)
    else if (this.overlayMode === 'ZONING') {
      if (tile.zoning === 'RESIDENTIAL') ctx.fillStyle = 'rgba(34, 197, 94, 0.55)';
      else if (tile.zoning === 'COMMERCIAL') ctx.fillStyle = 'rgba(59, 130, 246, 0.55)';
      else if (tile.zoning === 'INDUSTRIAL') ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
      else if (tile.zoning === 'CIVIC') ctx.fillStyle = 'rgba(168, 85, 247, 0.55)';
      else ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
      this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

      if (this.camera.zoom >= 0.75) {
        const zCode = tile.zoning ? tile.zoning.slice(0, 3) : 'NONE';
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, zCode, '#0f172a', '#e2e8f0');
      }
    }

    // 5. 10 NEIGHBORHOOD DISTRICTS VIEW
    else if (this.overlayMode === 'DISTRICTS') {
      const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#64748b', '#10b981', '#06b6d4', '#0284c7', '#a855f7', '#ec4899'];
      const col = colors[(tile.districtId - 1) % colors.length];
      ctx.fillStyle = col + '55';
      this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

      if (this.camera.zoom >= 0.75) {
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, `D${tile.districtId}`, '#0f172a', '#e2e8f0');
      }
    }

    // 6. ANTIGRAVITY SKY CITIES VIEW
    else if (this.overlayMode === 'ANTIGRAVITY') {
      if (tile.floatingBuilding) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, `🛸 Z=${Math.round(tile.floatingBuilding.current_z || 64)}`, '#0369a1', '#ffffff');
      }
    }

    ctx.restore();
  }

  renderFlyingTransit(ctx, gameState) {
    ctx.save();
    const arcologies = [];
    const size = gameState.gridSize || 60;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const t = gameState.grid && gameState.grid[x] && gameState.grid[x][y];
        if (t && t.floatingBuilding) {
          arcologies.push({ x, y, pos: this.gridToScreen(x, y, 64) });
        }
      }
    }

    if (arcologies.length > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      for (let i = 0; i < arcologies.length - 1; i++) {
        ctx.moveTo(arcologies[i].pos.x, arcologies[i].pos.y);
        ctx.lineTo(arcologies[i + 1].pos.x, arcologies[i + 1].pos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

window.IsometricRenderer = IsometricRenderer;
