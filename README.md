# 🏙️ City Master: MMO Isometric City-Building & Socio-Economic Simulation

A web-based, educational multiplayer city-building simulation designed for up to 50 concurrent players operating on a persistent 2D dimetric isometric map. Built with **simulated antigravity physics**, **spatial cellular automata**, **Philadelphia-style municipal governance**, **macroeconomic resource diplomacy**, and **collateralized margin trading with automated 3-tier liquidation**.

Designed and optimized to run fluidly (60 FPS) on basic school Chromebooks, featuring pedagogical UX scaffolding tailored for ninth-grade students.

---

## 🚀 Quick Start

### 1. Launch the Server
```bash
npm start
# or: node server/server.js
```
The server runs with **zero external dependencies** using Node.js standard modules and an RFC 6455 WebSocket engine.

### 2. Play the Game
Open your browser to:
[http://localhost:3000](http://localhost:3000)

Open multiple browser tabs or windows to simulate simultaneous multiplayer competitors!

### 3. Run the Subsystem Test Suite
```bash
npm test
# or: node test/simulation_test.js
```

---

## 🌟 Core Gameplay Systems & Mechanics

### 1. 🛸 Simulated Antigravity Physics
- **2:1 Dimetric Projection Coordinates**:
  $$\text{screen.x} = (\text{map.x} - \text{map.y}) \times \frac{\text{TILE\_WIDTH}}{2}$$
  $$\text{screen.y} = (\text{map.x} + \text{map.y}) \times \frac{\text{TILE\_HEIGHT}}{2} - z\_offset$$
- **Sinusoidal Hovering**: Continuous bobbing motion: $z\_offset(t) = \text{base\_z} + \sin(t \cdot \omega) \cdot A$.
- **Dynamic Ground Shadows**: Projected at $z=0$ with opacity and scale inversely proportional to elevation $z\_offset$.
- **Vertical Plane Expansion**: Level 4 Floating Arcologies hover directly above existing ground structures.
- **Pollution Immunity**: Floating arcologies escape ground-level industrial pollution radius.
- **Flying Transit Networks**: Citizens in arcologies bypass ground traffic, utilizing Euclidean/Pythagorean pathfinding: $d = \sqrt{\Delta x^2 + \Delta y^2}$.
- **Maintenance & Catastrophic Crash Dynamics**: Requires continuous Rare-Earth Elements and Superconductors. Resource starvation causes $z\_offset$ decay to 0 $\to$ **catastrophic crash**, destroying ground buildings beneath, leaving ruins, and inflicting municipal cleanup penalties!

### 2. 🗺️ Spatial Synergies & Cellular Automata (Indirect PvP)
- **10 Legislative Districts** across a 60x60 grid with distinct base land values and council traits.
- **Industrial AoE Pollution**: Heavy ground pollution depressurizes adjacent residential land value, triggering tenant abandonment.
- **Commercial Labor Pools**: Requires nearby residential workforce and generates crime (requires police coverage).
- **Desirability Heatmap**: Real-time property valuation based on infrastructure, services, and low pollution.

### 3. 🏛️ Philadelphia-Inspired Municipal Politics & Labor
- **Councilmanic Prerogative**: District councilmembers hold unilateral veto power over zoning variances and Level 4 Arcologies within their boundaries.
- **Zoning Board of Adjustment (ZBA)**: 5-member board adjudicating variance appeals, influenced by the Mayor, Councilmembers, and player Influence Points.
- **Trade Unions & 10-Year Tax Abatements (Ordinances 961 & 1130)**:
  - **Union Labor**: Higher upfront cost (+40%), 3x build speed, zero strikes, unlocks 10-year 100% property tax abatements.
  - **Non-Union Labor**: Cheap upfront, but subject to random wildcat strikes and political hostility.
- **Cyclic Municipal Elections**: Players and AI firms run campaigns for District Council seats and the Office of the Mayor.
- **Spendable Influence Points (IP)**: Earned via civic buildings and campaign donations; spent to override vetoes, bribe/lobby ZBA, or trigger corruption audits against rival firms.

### 4. 🌐 Macroeconomics, Resource Exchange & Geopolitics
- **Dynamic Spot Market**: Concrete, Steel, Timber, Rare-Earth Elements, Superconductors.
- **Foreign NPC Governments (Federation of Valoria)**: Periodically enacts tariffs or total export embargoes on rare-earths.
- **Mayor Resolution Pathways**:
  - **Diplomatic Negotiation (Soft Power)**: Spends municipal treasury + IP to enact free-trade accords.
  - **Military Campaign (Hard Power)**: Mayor proposes a council-voted budget allocation with probabilistic outcomes (Victory $\to$ cheap resource flood; Defeat $\to$ destroyed infrastructure and price spikes).

### 5. 📈 Stock Market & Automated 3-Tier Liquidation
- **Net Asset Value (NAV) Pricing**:
  $$\text{NAV} = \frac{\text{Land Value} + \text{Building Costs} + \text{Liquid Cash} + \text{NPV of Net Rent}}{\text{Total Shares}}$$
- **Hostile Takeovers**: Acquiring $>50\%$ voting stake in a rival allows forcibly absorbing their land, buildings, and assets!
- **Central Bank Collateralized Loans**: Borrowing against stock portfolio with real-time margin metrics: `Equity`, `Used Margin`, `Available Margin`, `Margin Ratio` ($\frac{\text{Equity}}{\text{Used Margin}} \times 100\%$).
- **Automated 3-Tier Liquidation Engine**:
  1. **Tier 1 (Early Warning $<130\%$)**: Buffer thinning alert.
  2. **Tier 2 (Margin Call $<110\%$)**: 60-tick grace period with construction freeze and actionable educational modal.
  3. **Tier 3 (Liquidation $<100\%$)**: Automated fire-sale of assets (most liquid first at 30–50% discount) to clear bank debt.

---

## 💻 Chromebook & Performance Optimizations

1. **Strict Viewport Culling**: Only visible grid tiles within the active camera bounding box are processed (`renderable = false` for off-screen objects).
2. **Procedural Off-Screen Tile Baking**: Zero asset image download overhead; pre-baked canvas textures.
3. **ChangeTree Delta Synchronization**: Transmits only mutated state at 20 Hz, maintaining outbound data rates well below 20 KB/s per client.
4. **Session Reconnection Tokens**: Recovers session state instantly across Wi-Fi drops or Chromebook lid closures without losing game progress.
