import { WebSocketServer } from "ws";
import { createServer } from "http";
import { v4 } from "uuid";
import next from "next";
import fetch from "node-fetch";
import dotenv from "dotenv";
 


const BOT_TOKEN = "8490569804:AAF8gPT2dOjSfzOmOJyT-u0IV7Sd-J26TSk";
const GAME_SHORT_NAME = "short_game";

const app = next({ dev: true});
const handle = app.getRequestHandler();
dotenv.config();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      // Handle Telegram updates
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const update = JSON.parse(body);

          if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;

            // If user types /start or /play, send the Play button
            if (text === "/start" || text === "/play") {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendGame`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  game_short_name: GAME_SHORT_NAME,
                }),
              });
            }
          }
          if (update.callback_query) {
            const callback = update.callback_query;
            if (callback.game_short_name === GAME_SHORT_NAME) {
              await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: callback.id,
                  url: "https://nonviolative-isaura-nonhumorously.ngrok-free.dev",
                }),
              });
            }
          }
        } catch (err) {
          console.error("Telegram webhook error:", err);
        }

        res.writeHead(200);
        res.end("ok");
      });
    } else {
      handle(req, res);
    }
  });

  const wss = new WebSocketServer({ server });

  const messages = [];
  const players = [];

  // server.on("upgrade", (req, socket, head) => {
  //       if (req.headers["sec-websocket-protocol"] === "vite-hmr") {
  //     return;
  //   }
  //   wss.handleUpgrade(req, socket, head, (ws) => {
  //     wss.emit("connection", ws, req);
  //   });
  // });

  wss.on("connection", (ws) => {
    ws.id = v4();
    players.push(ws);

        if (req.headers["sec-websocket-protocol"] === "vite-hmr") {
      return;
    }

    if (players.length < 2) {
      ws.send("Waiting for more players...");
    } else {
      ws.send(JSON.stringify(messages));
    }

    ws.on("message", (message) => {

      if(!message)
      {
         return;

      }
      messages.push({ id: ws.id, message: message.toString("utf8") });

      for (const player of players) {
        if (player.readyState === player.OPEN) {
          player.send(JSON.stringify(messages));
        }
      }
    });

    ws.on("error", (error) => console.log(error));

    ws.on("close", () => {
      console.log("connection closed", ws.id);
      const index = players.findIndex((p) => p.id === ws.id);
      if (index !== -1) players.splice(index, 1);
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Server ready on http://localhost:3000");
  });
});
