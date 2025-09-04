const express = require("express");
const app = express();
const port = 3000;

// Middleware untuk log waktu request
app.use((req, res, next) => {
  console.log(`[REST] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Endpoint ping
app.get("/ping", (req, res) => {
  res.json({ message: "pong", timestamp: Date.now() });
});

app.listen(port, () => {
  console.log(`REST API server running at http://localhost:${port}`);
});
