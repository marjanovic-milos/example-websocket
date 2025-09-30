import { WebSocketServer } from "ws";
import { createServer } from "http";
import { v4 } from "uuid";

import next from "next";

const app = next({ dev: true });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ port: 8080 });

  const messages = [];
  const players = [];

  wss.on("connection", function connection(ws) {
    ws.id = v4();
    players.push(ws);

    if (players.length < 2) {
      ws.send("Waiting for more players...");
    } else {
      ws.send(JSON.stringify(messages));
    }

    ws.on("message", (message) => {
      messages.push({ id: ws.id, message: message.toString("utf8") });

      for (const player of players) {
        if (player.readyState === player.OPEN) {
          player.send(JSON.stringify(messages));
        }
      }
    });

    ws.on("error", console.error);

    ws.on("close", () => {
      console.log("connection closed", ws.id);

      const index = players.findIndex((p) => p.id === ws.id);
      if (index !== -1) {
        players.splice(index, 1);
      }
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Server ready on http://localhost:3000");
  });
});
