import { WebSocketServer } from "ws";
import { v4 as uuid } from "uuid";

const wss = new WebSocketServer({ port: 8080 });

/**
 * Data Structures
 */
const rooms = {};          // { roomId: { players: [], spectators: [] } }
const clientInfo = new Map(); // ws -> { name, isHost, roomId }

/**
 * Helpers
 */
function broadcast(roomId, msg, sender) {
  const room = rooms[roomId];
  if (!room) return;

  [...room.players, ...room.spectators].forEach(client => {
    if (client.ws !== sender && client.ws.readyState === 1) {
      client.ws.send(msg);
    }
  });
}

wss.on("connection", (ws) => {
  ws.id = uuid();

  ws.on("message", (raw) => {
    const data = raw.toString();
    const [cmd, ...args] = data.split("|");

    switch (cmd) {
      /**
       * ==== Lobby & Connection ====
       */

      case "CWHO": {
        // Client Who: client sends name + isHost
        const [name, hostFlag, roomIdArg] = args;
        const roomId = roomIdArg || uuid();

        if (!rooms[roomId]) {
          rooms[roomId] = { players: [], spectators: [] };
        }

        const playerObj = { ws, name, isHost: hostFlag === "1" };

        if (rooms[roomId].players.length < 2) {
          rooms[roomId].players.push(playerObj);
        } else {
          rooms[roomId].spectators.push(playerObj);
        }

        clientInfo.set(ws, { name, isHost: hostFlag === "1", roomId });

        // Inform all clients in room
        broadcast(roomId, `SCONN|${name}`, ws);
        break;
      }

      case "CACCPT": {
        const { roomId } = clientInfo.get(ws);
        broadcast(roomId, "SACCPT|acceptance", ws);
        break;
      }

      /**
       * ==== Gameplay ====
       */

      case "CDCS": {
        // Dice values rolled
        const { roomId } = clientInfo.get(ws);
        broadcast(roomId, `SDCS|${args[0]}|${args[1]}`, ws);
        break;
      }

      case "CMOV": {
        // A move: fromSlot, toSlot, dice1, dice2
        const { roomId } = clientInfo.get(ws);
        broadcast(roomId, `SMOV|${args[0]}|${args[1]}|${args[2]}|${args[3]}`, ws);
        break;
      }

      case "CNG": {
        // Continue game
        const { roomId } = clientInfo.get(ws);
        broadcast(roomId, `SNG|${args[0]}`, ws);
        break;
      }

      case "CRMV": {
        // Remove piece
        const { roomId } = clientInfo.get(ws);
        broadcast(roomId, `SRMV|${args[0]}`, ws);
        break;
      }

      /**
       * ==== Observer ====
       */

      case "COBSRV": {
        // Observer requests game state (you'll generate actual state here)
        const { roomId } = clientInfo.get(ws);
        // TODO: Build game snapshot here (currently placeholder)
        const snapshot = "time|pieces|slots";
        broadcast(roomId, `SOBSRV|${snapshot}`, ws);
        break;
      }

      /**
       * ==== Lobby host list sync ====
       */

      case "CIPA": {
        // Host sends IP to main server (for lobby sync)
        // Example: Add to a global lobby system
        console.log("Host registered:", args);
        break;
      }

      case "CAMNT": {
        // Update host with player count
        console.log("Host update:", args);
        break;
      }
    }
  });

  ws.on("close", () => {
    const info = clientInfo.get(ws);
    if (!info) return;
    const { roomId, name } = info;

    const room = rooms[roomId];
    if (!room) return;

    // Remove client from players/spectators
    room.players = room.players.filter(p => p.ws !== ws);
    room.spectators = room.spectators.filter(s => s.ws !== ws);

    broadcast(roomId, `SOUT|${name}`);
    clientInfo.delete(ws);
  });
});

console.log("✅ WebSocket server running on ws://localhost:8080");


// CWHO → registers player in a room.

// CACCPT → broadcast acceptance.

// CDCS → forward dice rolls.

// CMOV → forward moves.

// CNG → continue game.

// CRMV → remove piece.

// COBSRV → placeholder for sending full game state.