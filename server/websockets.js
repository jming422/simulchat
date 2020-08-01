const WebSocket = require('ws');

let wss;

const initWss = (webServer) => {
  if (wss) {
    throw Error("Websocket server already initialized; won't start another one!");
  }

  wss = new WebSocket.Server({ server: webServer, path: '/ws' });

  function noop() {}
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws) => {
    console.log('websocket connected');
    ws.isAlive = true;

    ws.on('pong', heartbeat);

    ws.on('message', (msg) => {
      console.log(`received msg, broadcasting to all other clients: ${JSON.stringify(msg)}`);
      const clients = [...wss.clients];
      clients
        .filter((c) => c !== ws)
        .forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(msg);
          }
        });
    });

    ws.on('close', () => {
      console.log('websocket disconnected');
    });
  });

  // continually ping open websocket connections to prevent heroku timeout
  const heartrate = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping(noop);
    });
  }, 45000);

  return heartrate;
};

module.exports = { initWss };
