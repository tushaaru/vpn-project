const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// API to generate QR
app.post("/generate-peer", (req, res) => {
  res.json({
    qr: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=REAL_VPN_CONFIG"
  });
});

// Status API (optional)
app.get("/status", (req, res) => {
  res.json({
    status: "connected",
    location: "Germany",
    time: "5 min"
  });
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});