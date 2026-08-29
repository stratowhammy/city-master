// public/js/engine/IsometricRenderer.js
// 2:1 Dimetric Isometric Renderer with Strict Viewport Culling,
// Sinusoidal Antigravity Bobbing, Dynamic Shadows, and Overlay Heatmaps.

class IsometricRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.assets = assets;

    this.TILE_WIDTH = 64;
    this.TILE_HEIGHT = 32;

    // Camera & Viewport
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      minZoom: 0.4,
      maxZoom: 2.2
    };

    this.hoveredTile = null;
    this.selectedTile = null;
    this.overlayMode = 'NORMAL'; // 'NORMAL', 'ZONING', 'POLLUTION', 'LAND_VALUE', 'DISTRICTS', 'ANTIGRAVITY'

    // Flying transit vehicles (Pythagorean paths)
    this.skyVehicles = [];
    this.initSkyVehicles();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * (window.devicePixelRatio || 1);
    this.canvas.height = h * (window.devicePixelRatio || 1);
    this.ctx.imageSmoothingEnabled = false;
  }

  initSkyVehicles() {
    for (let i = 0; i < 24; i++) {
      this.skyVehicles.push({
        startX: Math.random() * 60,
        startY: Math.random() * 60,
        targetX: Math.random() * 60,
        targetY: Math.random() * 60,
        speed: 0.03 + Math.random() * 0.03,
        t: Math.random(),
        z_offset: 56 + Math.random() * 24
      });
    }
  }

  // Exact 2:1 Dimetric Coordinate Math (Page 2)
  gridToScreen(mapX, mapY, z_offset = 0) {
    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;
    const screenX = (mapX - mapY) * hw;
    const screenY = (mapX + mapY) * hh - z_offset;
    return { x: screenX, y: screenY };
  }

  // Screen pixel coordinate to isometric map grid (x, y)
  screenToGrid(screenX, screenY) {
    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;
    const mapX = Math.floor((screenX / hw + screenY / hh) / 2);
    const mapY = Math.floor((screenY / hh - screenX / hw) / 2);
    return { x: mapX, y: mapY };
  }

  render(gameState, localPlayerFirmId) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Fast clear background (Deep navy starry sky)
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Apply camera transform & zoom
    ctx.translate(width / 2 + this.camera.x, height / 2 + this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    if (!gameState || !gameState.grid || !gameState.grid[0]) {
      ctx.restore();
      return;
    }

    const gridSize = gameState.gridSize || 60;
    const floatingDrawQueue = [];

    // Render all 60x60 tiles in strict Painter's Order (sum = x + y)
    for (let sum = 0; sum <= (gridSize * 2); sum++) {
      for (let x = 0; x < gridSize; x++) {
        const y = sum - x;
        if (y < 0 || y >= gridSize) continue;

        const tile = gameState.grid[x] && gameState.grid[x][y];
        if (!tile) continue;

        const screenPos = this.gridToScreen(x, y, 0);

        // A. Draw Base Ground Terrain
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

        // B. Draw District Borders / Ownership Outline
        if (tile.ownerId) {
          const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
          const col = firm ? firm.color : '#38bdf8';
          ctx.strokeStyle = (tile.ownerId === localPlayerFirmId) ? '#60a5fa' : col;
          ctx.lineWidth = 1.5;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        }

        // C. Draw Overlays (Pollution AoE, Land Value, Zoning, Districts)
        this.renderTileOverlay(ctx, tile, screenPos);

        // D. Draw Dynamic Ground Shadow if Antigravity building exists above
        if (tile.floatingBuilding) {
          const curZ = tile.floatingBuilding.current_z || tile.floatingBuilding.z_offset || 64;
          this.assets.drawAntigravityShadow(ctx, screenPos.x, screenPos.y + this.TILE_HEIGHT / 2, curZ);
          floatingDrawQueue.push({ tile, x, y, screenPos });
        }

        // E. Draw Ground Building (Level 1..3)
        if (tile.groundBuilding) {
          const firm = gameState.firms instanceof Map ? gameState.firms.get(tile.ownerId) : null;
          const ownerColor = firm ? firm.color : '#3b82f6';
          this.assets.drawGroundBuilding(ctx, screenPos.x, screenPos.y + this.TILE_HEIGHT / 2, tile.groundBuilding, ownerColor);
        }

        // F. Highlight hovered or selected tile
        if (this.hoveredTile && this.hoveredTile.x === x && this.hoveredTile.y === y) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.0;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        }
        if (this.selectedTile && this.selectedTile.x === x && this.selectedTile.y === y) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3.5;
          this.strokeTileDiamond(ctx, screenPos.x, screenPos.y);
        }
      }
    }

    // 2. Render Floating Antigravity Arcologies (Z-Axis Layer)
    for (const item of floatingDrawQueue) {
      const { tile, screenPos } = item;
      const arcology = tile.floatingBuilding;
      const curZ = arcology.current_z || arcology.z_offset || 64;
      const floatingScreenY = screenPos.y + (this.TILE_HEIGHT / 2) - curZ;
      const firm = gameState.firms.get(tile.ownerId);
      const ownerColor = firm ? firm.color : '#38bdf8';

      this.assets.drawFloatingArcology(ctx, screenPos.x, floatingScreenY, arcology, ownerColor);
    }

    // 3. Render Flying Transit Sky Lanes & Autonomous Flying Vehicles (Page 2)
    this.renderFlyingTransit(ctx, gameState);

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

  renderTileOverlay(ctx, tile, screenPos) {
    if (this.overlayMode === 'NORMAL') return;

    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(screenPos.x, screenPos.y);
    ctx.lineTo(screenPos.x + hw, screenPos.y + hh);
    ctx.lineTo(screenPos.x, screenPos.y + this.TILE_HEIGHT);
    ctx.lineTo(screenPos.x - hw, screenPos.y + hh);
    ctx.closePath();

    if (this.overlayMode === 'POLLUTION') {
      // Red AoE heatmap for pollution (Page 6 & 11)
      if (tile.pollution > 0) {
        const alpha = Math.min(0.75, (tile.pollution / 100) * 0.85);
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.fill();
      }
    } else if (this.overlayMode === 'LAND_VALUE') {
      // Desirability heatmap: Green = high value, Red = depressed
      const valRatio = Math.min(1.0, Math.max(0.1, tile.desirability / 100));
      const r = Math.round(255 * (1 - valRatio));
      const g = Math.round(220 * valRatio);
      ctx.fillStyle = `rgba(${r}, ${g}, 50, 0.45)`;
      ctx.fill();
    } else if (this.overlayMode === 'ZONING') {
      if (tile.zoning === 'RESIDENTIAL') ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
      else if (tile.zoning === 'COMMERCIAL') ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
      else if (tile.zoning === 'INDUSTRIAL') ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      else if (tile.zoning === 'CIVIC') ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
      else ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.fill();
    } else if (this.overlayMode === 'DISTRICTS') {
      const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#64748b', '#10b981', '#06b6d4', '#0284c7', '#a855f7', '#ec4899'];
      const col = colors[(tile.districtId - 1) % colors.length];
      ctx.fillStyle = col + '44'; // 25% opacity
      ctx.fill();
    } else if (this.overlayMode === 'ANTIGRAVITY') {
      if (tile.floatingBuilding) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderFlyingTransit(ctx, gameState) {
    ctx.save();
    for (const v of this.skyVehicles) {
      v.t += v.speed * 0.15;
      if (v.t >= 1.0) {
        v.t = 0;
        v.startX = v.targetX;
        v.startY = v.targetY;
        v.targetX = Math.random() * gameState.gridSize;
        v.targetY = Math.random() * gameState.gridSize;
      }

      const curGridX = v.startX + (v.targetX - v.startX) * v.t;
      const curGridY = v.startY + (v.targetY - v.startY) * v.t;
      const pos = this.gridToScreen(curGridX, curGridY, v.z_offset);

      // Draw futuristic flying sky-capsule
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Ion thruster trail
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x - (v.targetX - v.startX) * 0.8, pos.y - (v.targetY - v.startY) * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

window.IsometricRenderer = IsometricRenderer;
