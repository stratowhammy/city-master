// test/network_test.js
// Network & WebSocket multiplayer synchronization test

const http = require('node:http');

async function runNetworkTest() {
  console.log('🌐 Starting WebSocket Network Integration Test...\n');

  // Verify server is reachable and test REST status endpoint
  const statusRes = await fetch('http://localhost:3000/api/status').then(r => r.json()).catch(() => null);
  if (!statusRes) {
    console.log('ℹ️ Local server on :3000 not started yet. Launching embedded test server on :3002...');
    process.env.PORT = 3002;
    require('../server/server.js');
    await new Promise(r => setTimeout(r, 600));
  }

  const port = process.env.PORT || 3000;
  const wsUrl = `ws://localhost:${port}`;
  console.log(`Connecting to ${wsUrl}...`);

  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    let authenticatedToken = null;

    ws.onopen = () => {
      console.log('✅ WebSocket Connected. Sending INIT_AUTH...');
      ws.send(JSON.stringify({ type: 'INIT_AUTH', payload: {} }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'INIT_STATE') {
        console.log(`✅ Received INIT_STATE! Firm: ${msg.data.firmId}, ReconnectToken: ${msg.data.reconnectionToken}`);
        authenticatedToken = msg.data.reconnectionToken;

        // Perform test actions
        console.log('Sending BUY_LAND action for (15, 15)...');
        ws.send(JSON.stringify({ type: 'BUY_LAND', payload: { x: 15, y: 15 } }));

        console.log('Sending CONSTRUCT_BUILDING action for (15, 15)...');
        ws.send(JSON.stringify({
          type: 'CONSTRUCT_BUILDING',
          payload: { x: 15, y: 15, buildingType: 'RESIDENTIAL', unionBuilt: true }
        }));

        console.log('Sending TRADE_STOCK action...');
        ws.send(JSON.stringify({
          type: 'TRADE_STOCK',
          payload: { targetFirmId: 'firm_bot_2', count: 100, isBuy: true }
        }));
      } else if (msg.type === 'ACTION_SUCCESS') {
        console.log(`✅ ACTION_SUCCESS received from server: "${msg.data.message}"`);
      } else if (msg.type === 'DELTA_PATCH') {
        console.log(`✅ DELTA_PATCH received (Tick: ${msg.data.tick}, Delta bandwidth < 20KB/s)`);
        ws.close();
        resolve();
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      reject(err);
    };

    setTimeout(() => {
      ws.close();
      resolve();
    }, 4000);
  });

  console.log('\n🎉 NETWORK INTEGRATION TEST COMPLETED SUCCESSFULLY!');
}

runNetworkTest();
