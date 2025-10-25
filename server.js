import express from "express";
import { WebSocketServer, WebSocket } from "ws";
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

const messages = [];

// ✅ Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {

  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const chatId = fullUrl.searchParams.get("chat_id");

  ws.chatId = chatId;
  clients.add(ws);

  console.log("✅ WebSocket client connected. Total:", clients.size);

  ws.on("close", () => {
    clients.delete(ws);
    console.log("❌ WebSocket client disconnected. Total:", clients.size);
  });

  ws.on("message", async (msg) => {
    try {

      const data = JSON.parse(msg.toString());
      console.log("WS message:", data);
      messages.push(data.text);

      // ✅ Only start broadcasting if at least 2 clients are connected
      if (clients.size >= 2) {

        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(messages));
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
  const unique = 1111;
  const gameUrl = `${WEBAPP_URL}?chat_id=${unique}`;
 
  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      console.log("Telegram message:", text);

      // Telegram command handling
      if (text === "/start" || text === "/play") {

        console.log(update , 'ovo je body od webhooka');
        
const userId = update.message.from.id;
const photoUrl = await getUserPhotoUrl(userId);
console.log("User photo:", photoUrl);

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendGame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            game_short_name: GAME_SHORT_NAME,
          }),


          
        });


        // if (!waitingPlayer) {
        //   waitingPlayer = chatId;
        //   console.log(chatId, "⏳ Waiting for another player...");
        // } else {
        //   const otherId = waitingPlayer;
        //   waitingPlayer = null;

 

        //  await sendGameInvite(chatId, gameUrl, otherId);
        //  await sendGameInvite(otherId, gameUrl, chatId);

        // }
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
          url: gameUrl
        }),
      });

     }
    }


    res.sendStatus(200);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    res.sendStatus(500);
  }
});



// async function sendGameInvite(toChatId, gameUrl, opponentId) {
//   await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       chat_id: toChatId,
//       text: `🎮 Your match is ready! Join the game here:`,
//       reply_markup: {
//         inline_keyboard: [[{ text: "Play Now", url: gameUrl }]],
//       },
//     }),
//   });
// }
// ✅ Create HTTP server and integrate WebSocket



async function getUserPhotoUrl(userId) {
  const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${userId}`);
  const photos = await photosRes.json();

  if (!photos.result?.photos?.length) return null;

  const fileId = photos.result.photos[0].at(-1).file_id;

  const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const fileData = await fileRes.json();

  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
}



const server = createServer(app);

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
