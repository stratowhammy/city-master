// public/js/app.js
// Main client bootloader and 60 FPS requestAnimationFrame rendering loop

window.addEventListener('DOMContentLoaded', () => {
  console.log('Bootstrapping City Master Client...');

  const canvas = document.getElementById('game-canvas');
  const assets = new TileAssets();
  const renderer = new IsometricRenderer(canvas, assets);
  const network = new NetworkClient();
  const advisor = new AdvisorSystem(network);
  const ui = new UIController(network, renderer, advisor);
  const tutorial = new TutorialSystem(network, renderer, ui);

  // Global UI bridge
  window.ui = ui;
  window.network = network;
  window.renderer = renderer;
  window.tutorial = tutorial;

  // Center camera directly on the middle of the city grid
  renderer.camera.x = 0;
  renderer.camera.y = -480;
  renderer.camera.zoom = 0.85;

  // 60 FPS Rendering Loop (Chromebook Optimized)
  function renderLoop() {
    if (network.gameState && network.gameState.grid) {
      renderer.render(network.gameState, network.firmId);
    }
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
  console.log('City Master Client 60 FPS Loop Active!');
});
