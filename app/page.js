"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const ws = useRef(null);

  useEffect(() => {
    // ws.current = new WebSocket("ws://localhost:8080");
    // const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    ws.current = new WebSocket(`wss://nonviolative-isaura-nonhumorously.ngrok-free.dev`);
    // ws.current = new WebSocket(`wss://${window.location.host}`);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.current.onerror = (err) => {
      setError(err);
      console.error("WebSocket error:", err);
    };

    return () => {
      ws.current.close();
    };
  }, []);

  const sendMessage = (e) => {
    e.preventDefault();
    if (ws.current && input.trim() !== "") {
      ws.current.send(input);
      setInput("");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>WebSocket Chat</h2>

      <div style={{ background: "lightblue" }}> Test testic</div>
      <form onSubmit={sendMessage}>
        <label htmlFor='message'>Enter Message:</label>
        <input type='text' id='message' name='message' value={input} onChange={(e) => setInput(e.target.value)} style={{ marginLeft: "1rem" }} />
        <button type='submit' style={{ marginLeft: "1rem" }}>
          Send
        </button>
      </form>
      {/* <div>{window.location.host}: HOST</div> */}

      <div id='messages' style={{ marginTop: "2rem" }}>
        {messages.map((msg, i) => (
          <div key={i}>Message from server: {msg}</div>
        ))}
      </div>
    </div>
  );
}
