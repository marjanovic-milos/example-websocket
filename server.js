import express from "express";
import { WebSocketServer } from "ws";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { createServer } from "http";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = "8490569804:AAF8gPT2dOjSfzOmOJyT-u0IV7Sd-J26TSk";
const GAME_SHORT_NAME = "short_game";
const WEBAPP_URL = "https://nonviolative-isaura-nonhumorously.ngrok-free.dev";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // Serve index.html and assets from /public

const clients = new Set();

// ✅ Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log("✅ WebSocket client connected. Total:", clients.size);

  ws.on("close", () => {
    clients.delete(ws);
    console.log("❌ WebSocket client disconnected. Total:", clients.size);
  });

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log("WS message:", data);

      // ✅ Only start broadcasting if at least 2 clients are connected
      if (clients.size >= 2) {
        for (const client of clients) {
          if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ from: "client", data }));
          }
        }
      } else {
        console.log("Waiting for second user to connect...");
      }

    } catch (err) {
      console.error("WS message error:", err);
    }
  });
});

// ✅ Telegram Webhook
app.post("/webhook", async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      console.log("Telegram message:", text);

      // ✅ Send Telegram message to all connected WS clients if 2+ users
      if (clients.size >= 2) {
        for (const client of clients) {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: "message", chatId, text }));
          }
        }
      }

      // Telegram command handling
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
        await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callback.id,
              url: WEBAPP_URL,
            }),
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    res.sendStatus(500);
  }
});

// ✅ Create HTTP server and integrate WebSocket
const server = createServer(app);

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
