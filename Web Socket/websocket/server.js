const https = require("https");
const fs = require("fs");
const WebSocket = require("./node_modules/ws");
const express = require("express");
const url = require("url");
const path = require("path");

const app = express();
const PORT = 8443;
const VALID_TOKEN = "12345";
const MAX_CONNECTIONS = 10;

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "public")));

// Sertifikat SSL lokal
const server = https.createServer({
  cert: fs.readFileSync("./cert/cert.pem"),
  key: fs.readFileSync("./cert/key.pem"),
}, app);

const wss = new WebSocket.Server({ server });
const clients = new Map();

// Logging awal
server.listen(PORT, () => {
  console.log(`✅ WebSocket Secure Server running at https://localhost:${PORT}`);
});

wss.on("connection", (socket, req) => {
  if (clients.size >= MAX_CONNECTIONS) {
    socket.send(JSON.stringify({ type: "error", message: "Server penuh. Coba lagi nanti." }));
    socket.close();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const token = parsedUrl.query.token;

  // Autentikasi token
  if (token !== VALID_TOKEN) {
    socket.send(JSON.stringify({ type: "error", message: "Token tidak valid." }));
    socket.close();
    return;
  }

  let username = null;

  socket.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === "join") {
      username = data.username;
      clients.set(socket, { username });
      console.log(`🔵 ${username} connected`);
      broadcast({ type: "init", message: `${username} telah bergabung` });
      sendUserList();
      broadcast({ type: "join", username }, socket);
    } else if (data.type === "chat") {
      broadcast({ type: "chat", username, message: data.message });
    } else if (data.type === "typing") {
      broadcast({ type: "typing", username }, socket);
    } else if (data.type === "stopTyping") {
      broadcast({ type: "stopTyping", username }, socket);
    } else if (data.type === "ping") {
      socket.send(JSON.stringify({ type: "pong" }));
    }
  });

  socket.on("close", () => {
    if (username) {
      console.log(`🔴 ${username} disconnected`);
      clients.delete(socket);
      broadcast({ type: "leave", username });
      sendUserList();
    }
  });
});

function broadcast(message, excludeSocket = null) {
  const msgStr = JSON.stringify(message);
  for (const [client] of clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeSocket) {
      client.send(msgStr);
    }
  }
}

function sendUserList() {
  const usernames = [...clients.values()].map((c) => c.username);
  const msg = JSON.stringify({ type: "userList", users: usernames });
  for (const [client] of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Broadcast tips setiap 60 detik
setInterval(() => {
  broadcast({ type: "init", message: "🌟 Tips: Jangan lupa istirahat sebentar ya!" });
}, 60000);
