// public/js/engine/IsometricRenderer.js
// 32-Bit Retro Dimetric Isometric Renderer (64x32) with Organic Black Void Map Expansion
// Features pitch-black void rendering, adjacent frontier lot unlocking, and 32-bit retro graphics.

class IsometricRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;

    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;

    this.camera = { x: 0, y: -480, zoom: 0.85 };
    this.overlayMode = 'NORMAL'; // 'NORMAL', 'LAND_VALUE', 'POLLUTION', 'UNOWNED', 'ZONING', 'DISTRICTS'

    // Feature Flag: Sky Cities disabled (preserved for future reactivation)
    this.ENABLE_SKY_CITIES = false;

    // Building & Zone Density Filter Toggles
    this.buildingFilters = {
      RESIDENTIAL: true,
      COMMERCIAL_L1: true,
      COMMERCIAL_L2: true,
      COMMERCIAL_L3: true,
      INDUSTRIAL: true
    };

    this.hoveredTile = null;
    this.selectedTile = null;
    this.activeTool = 'INSPECT';

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  initCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  // Convert Grid (x, y, z) -> Screen Coordinates (Strict 2:1 Dimetric)
  gridToScreen(gx, gy, gz = 0) {
    const screenX = (gx - gy) * (this.TILE_WIDTH / 2);
    const screenY = (gx + gy) * (this.TILE_HEIGHT / 2) - gz;
    return { x: screenX, y: screenY };
  }

  // Convert Screen (px, py) -> Grid Coordinates
  screenToGrid(screenX, screenY) {
    const worldX = (screenX - this.canvas.width / 2) / this.camera.zoom - this.camera.x;
    const worldY = (screenY - this.canvas.height / 2) / this.camera.zoom - this.camera.y;

    const halfW = this.TILE_WIDTH / 2;
    const halfH = this.TILE_HEIGHT / 2;

    const gx = (worldX / halfW + worldY / halfH) / 2;
    const gy = (worldY / halfH - worldX / halfW) / 2;

    return { x: Math.floor(gx), y: Math.floor(gy) };
  }

  // Organic Frontier Visibility Check:
  // Tile is visible ONLY IF it is owned/developed OR is an immediate neighboring unpurchased lot
  isTileVisible(gameState, x, y) {
    if (!gameState || !gameState.grid || !gameState.grid[x]) return false;
    const t = gameState.grid[x][y];
    if (!t) return false;

    // 1. Directly owned or maritime port / pier
    if (t.ownerId || (t.groundBuilding && (t.groundBuilding.type === 'PORT' || t.groundBuilding.type === 'PIER'))) {
      return true;
    }

    // 2. Immediate Neighbor to an already owned/developed parcel (8-neighborhood)
    const size = gameState.gridSize || 60;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          const nt = gameState.grid[nx] && gameState.grid[nx][ny];
          if (nt && (nt.ownerId || (nt.groundBuilding && (nt.groundBuilding.type === 'PORT' || nt.groundBuilding.type === 'PIER')))) {
            return true;
          }
        }
      }
    }

    // 3. For water tiles: visible if directly adjacent to any visible port or land
    if (t.isWater) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            const nt = gameState.grid[nx] && gameState.grid[nx][ny];
            if (nt && !nt.isWater && (nt.ownerId || (nt.groundBuilding && nt.groundBuilding.type === 'PORT'))) {
              return true;
            }
          }
        }
      }
    }

    // Beyond the immediate neighboring unpurchased lots: unrevealed black void!
    return false;
  }

  render(gameState, localPlayerFirmId) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    // 1. Clear Screen to Pitch Black Retro Void
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Camera Transform (Center + Zoom + Translation)
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(this.camera.x, this.camera.y);

    const gridSize = gameState.gridSize || 60;
    const halfW = this.TILE_WIDTH / 2;
    const halfH = this.TILE_HEIGHT / 2;

    // 2. Strict Viewport Bounding Box Culling (Chromebook Performance Optimization)
    const invZoom = 1 / this.camera.zoom;
    const wLeft = (-width / 2) * invZoom - this.camera.x;
    const wRight = (width / 2) * invZoom - this.camera.x;
    const wTop = (-height / 2) * invZoom - this.camera.y;
    const wBottom = (height / 2) * invZoom - this.camera.y;

    const gTop = { x: (wLeft / halfW + wTop / halfH) / 2, y: (wTop / halfH - wLeft / halfW) / 2 };
    const gRight = { x: (wRight / halfW + wTop / halfH) / 2, y: (wTop / halfH - wRight / halfW) / 2 };
    const gBottom = { x: (wRight / halfW + wBottom / halfH) / 2, y: (wBottom / halfH - wRight / halfW) / 2 };
    const gLeft = { x: (wLeft / halfW + wBottom / halfH) / 2, y: (wBottom / halfH - wLeft / halfW) / 2 };

    const margin = 4;
    const minSum = Math.max(0, Math.floor(Math.min(gTop.x + gTop.y, gRight.x + gRight.y, gBottom.x + gBottom.y, gLeft.x + gLeft.y) - margin));
    const maxSum = Math.min((gridSize - 1) * 2, Math.ceil(Math.max(gTop.x + gTop.y, gRight.x + gRight.y, gBottom.x + gBottom.y, gLeft.x + gLeft.y) + margin));

    // 3. Render Culled Grid in Isometric Painter's Order (sum = x + y)
    for (let sum = minSum; sum <= maxSum; sum++) {
      for (let x = 0; x <= sum; x++) {
        const y = sum - x;
        if (x >= gridSize || y >= gridSize || y < 0) continue;

        // ORGANIC BLACK BACKGROUND EXPANSION GATE:
        // If tile is beyond immediate neighboring unpurchased lots, completely skip rendering!
        if (!this.isTileVisible(gameState, x, y)) {
          continue;
        }

        const tile = gameState.grid[x] && gameState.grid[x][y];
        if (!tile) continue;

        const screenPos = this.gridToScreen(x, y, 0);

        // A. 32-Bit Retro Base Ground Terrain & Water
        let terrainKey = 'ground_grass';
        if (tile.isWater) terrainKey = 'ground_water';
        else if (tile.zoning === 'COMMERCIAL' || tile.zoning === 'INDUSTRIAL') terrainKey = 'ground_concrete';
        else if (tile.roadLevel > 0) terrainKey = 'ground_road';

        const terrainSprite = this.assets.cache.get(terrainKey);
        if (terrainSprite) {
          ctx.drawImage(terrainSprite, screenPos.x - this.TILE_WIDTH / 2, screenPos.y);
        } else {
          this.assets.draw32BitIsoDiamond(ctx, this.TILE_WIDTH, this.TILE_HEIGHT, '#2e7d32', '#1b5e20', '#388e3c', '#4caf50');
        }

        // Shoreline water-edge seam
        if (tile.isCoastline) {
          ctx.strokeStyle = '#bae6fd';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(screenPos.x, screenPos.y + this.TILE_HEIGHT);
          ctx.lineTo(screenPos.x + halfW, screenPos.y + halfH);
          ctx.stroke();
        }

        // B. Ownership Borders & Glowing Neon Green Available Land Highlighting
        this.renderOwnershipBorders(ctx, tile, screenPos, localPlayerFirmId, gameState);

        // C. Layer Overlays (Pollution, Land Value, For Sale, Zones, Districts)
        this.renderTileOverlay(ctx, tile, screenPos, localPlayerFirmId, gameState);

        // D. 32-Bit Retro Ground Buildings & Roads (Levels 1 to 4) & Ports
        if (tile.groundBuilding) {
          const b = tile.groundBuilding;
          let isVisible = true;

          if (b.type === 'RESIDENTIAL') {
            isVisible = this.buildingFilters.RESIDENTIAL;
          } else if (b.type === 'INDUSTRIAL') {
            isVisible = this.buildingFilters.INDUSTRIAL;
          } else if (b.type === 'COMMERCIAL') {
            if (b.level === 1) isVisible = this.buildingFilters.COMMERCIAL_L1;
            else if (b.level === 2) isVisible = this.buildingFilters.COMMERCIAL_L2;
            else if (b.level >= 3) isVisible = this.buildingFilters.COMMERCIAL_L3;
          }

          if (isVisible) {
            const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
            const ownerColor = firm ? firm.color : '#3b82f6';
            this.assets.drawGroundBuilding(ctx, screenPos.x, screenPos.y + this.TILE_HEIGHT / 2, b, ownerColor);

            // Informative badge above buildings when zoomed in
            if (this.camera.zoom >= 0.70) {
              if (b.type === 'PORT') {
                this.drawBuildingBadge(ctx, screenPos.x, screenPos.y - 16, b.name, '#0284c7');
              } else if (b.type === 'COMMERCIAL') {
                if (b.level === 1) this.drawBuildingBadge(ctx, screenPos.x, screenPos.y, '🏪 Store (L1 Comm)', '#0284c7');
                else if (b.level === 2) this.drawBuildingBadge(ctx, screenPos.x, screenPos.y, '🏢 Office (L2 Comm)', '#0369a1');
                else if (b.level >= 3) this.drawBuildingBadge(ctx, screenPos.x, screenPos.y, '🏬 Tower (L3 Comm)', '#1d4ed8');
              } else if (b.type === 'INDUSTRIAL') {
                this.drawBuildingBadge(ctx, screenPos.x, screenPos.y, '🏭 Factory', '#b45309');
              } else if (b.type === 'RESIDENTIAL') {
                this.drawBuildingBadge(ctx, screenPos.x, screenPos.y, `🏠 House L${b.level}`, '#047857');
              }
            }
          } else {
            // Render subtle ghost footprint when filtered off
            ctx.fillStyle = 'rgba(71, 85, 105, 0.20)';
            this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
          }
        }

        // E. Highlight Hovered / Selected Tile (Only on visible revealed frontier tiles)
        if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.0;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

          // Hover tag for unpurchased land
          if (!tile.ownerId && !tile.isWater) {
            this.drawTileBadge(ctx, screenPos.x, screenPos.y, `🏷️ FOR SALE: $${tile.landValue.toLocaleString()}`, '#059669', '#ffffff');
          }
        }

        if (this.selectedTile && this.selectedTile.x === x && this.selectedTile.y === y) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        }
      }
    }

    ctx.restore();
  }

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

  drawBuildingBadge(ctx, screenX, screenY, text, bgColor = '#0284c7') {
    ctx.save();
    ctx.font = 'bold 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 4;
    const badgeHeight = 12;
    const badgeWidth = textWidth + paddingX * 2;
    const badgeX = screenX - badgeWidth / 2;
    const badgeY = screenY - 4;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, screenX, badgeY + badgeHeight / 2);
    ctx.restore();
  }

  // Render distinct 32-bit borders & Neon Green Available Frontier Land
  renderOwnershipBorders(ctx, tile, screenPos, localPlayerFirmId, gameState) {
    ctx.save();

    const isBuyLandMode = (this.activeTool === 'BUY_LAND' || this.overlayMode === 'UNOWNED');

    if (!tile.ownerId) {
      if (tile.isWater) {
        ctx.restore();
        return;
      }

      // ✨ NEON GREEN AVAILABLE ADJACENT FRONTIER LAND HIGHLIGHTING
      if (isBuyLandMode || tile.perimeterForSale) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.45)'; // Vibrant Neon Green Fill
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

        ctx.strokeStyle = '#4ade80'; // Glowing Neon Green Border
        ctx.lineWidth = 2.0;
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

        // Price badge on available adjacent parcel
        if (this.camera.zoom >= 0.60) {
          const val = tile.landValue || 5000;
          this.drawTileBadge(ctx, screenPos.x, screenPos.y, `$${val.toLocaleString()}`, '#064e3b', '#86efac');
        }
      } else {
        // Subtle pixelated frontier border
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        ctx.setLineDash([]);
      }
    } else {
      // OWNED SQUARE
      const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
      const ownerColor = firm ? firm.color : '#38bdf8';
      const isMine = (tile.ownerId === localPlayerFirmId);

      if (isBuyLandMode) {
        ctx.fillStyle = isMine ? 'rgba(56, 189, 248, 0.20)' : 'rgba(15, 23, 42, 0.50)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      }

      if (isMine) {
        // Player's own land: Glowing cyan border
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

  // Main Map Overlays (Pollution, Land Value, Zoning, Districts)
  renderTileOverlay(ctx, tile, screenPos, localPlayerFirmId, gameState) {
    if (this.overlayMode === 'NORMAL' || this.overlayMode === 'UNOWNED') return;

    ctx.save();

    // 1. POLLUTION (DIRTY SMOKE HEATMAP VIEW)
    if (this.overlayMode === 'POLLUTION') {
      const pol = tile.pollution || 0;
      if (pol === 0) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.20)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else if (pol <= 25) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.50)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else if (pol <= 60) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.70)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      } else {
        ctx.fillStyle = 'rgba(225, 29, 72, 0.85)';
        this.fillTileDiamond(ctx, screenPos.x, screenPos.y);
      }

      ctx.strokeStyle = pol > 30 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1;
      this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

      if (this.camera.zoom >= 0.65) {
        const badgeBg = pol > 50 ? '#881337' : (pol > 20 ? '#78350f' : '#064e3b');
        const badgeText = pol > 0 ? `🌫️ ${pol}%` : '🌿 Clean';
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, badgeText, badgeBg, '#ffffff');
      }
    }

    // 2. LAND VALUE & DESIRABILITY HEATMAP VIEW
    else if (this.overlayMode === 'LAND_VALUE') {
      const val = tile.landValue || 5000;
      let fillColor = 'rgba(234, 179, 8, 0.5)';
      let badgeBg = '#78350f';
      let tag = `$${val.toLocaleString()}`;

      if (val < 2500) {
        fillColor = 'rgba(239, 68, 68, 0.65)';
        badgeBg = '#7f1d1d';
        tag = `🔻 $${val.toLocaleString()}`;
      } else if (val < 6000) {
        fillColor = 'rgba(234, 179, 8, 0.50)';
        badgeBg = '#78350f';
      } else if (val < 12000) {
        fillColor = 'rgba(34, 197, 94, 0.65)';
        badgeBg = '#064e3b';
        tag = `⭐ $${val.toLocaleString()}`;
      } else {
        fillColor = 'rgba(250, 204, 21, 0.85)';
        badgeBg = '#713f12';
        tag = `💎 $${val.toLocaleString()}`;
      }

      ctx.fillStyle = fillColor;
      this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);

      if (this.camera.zoom >= 0.65) {
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, tag, badgeBg, '#ffffff');
      }
    }

    // 3. ZONING VIEW
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

    // 4. 10 NEIGHBORHOOD DISTRICTS VIEW
    else if (this.overlayMode === 'DISTRICTS') {
      const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#64748b', '#10b981', '#06b6d4', '#0284c7', '#a855f7', '#ec4899'];
      const col = colors[(tile.districtId - 1) % colors.length];
      ctx.fillStyle = col + '55';
      this.fillTileDiamond(ctx, screenPos.x, screenPos.y);

      if (this.camera.zoom >= 0.75) {
        this.drawTileBadge(ctx, screenPos.x, screenPos.y, `D${tile.districtId}`, '#0f172a', '#e2e8f0');
      }
    }

    ctx.restore();
  }
}

window.IsometricRenderer = IsometricRenderer;
