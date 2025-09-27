import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);
  const messages = [];

  ws.on("message", function message(data) {
    // console.log("received: %s", data);

    const textString = data.toString("utf8");
    messages.push(textString);
    console.log("received: %s", JSON.stringify(messages));
  });

  ws.send(messages);
});
