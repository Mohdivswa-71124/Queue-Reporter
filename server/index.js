const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Database setup
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { queues: [] });

// Initialize DB
async function initDB() {
  await db.read();
  if (!db.data) {
    db.data = { queues: [] };
    await db.write();
  }
}
initDB();

// POST: Add a queue report
app.post("/api/report", async (req, res) => {
  const { location, minutes, category } = req.body;

  console.log("📥 Incoming POST /api/report:", req.body); // Add this!

  if (!location || !minutes || !category || category.trim() === "") {
    console.log("❌ Missing field:", { location, minutes, category });
    return res.status(400).send("Missing data");
  }

  await db.read();

  const count = db.data.queues.filter(
    (entry) => entry.location === location
  ).length;

  const newEntry = {
    location,
    minutes,
    "Reported Name": category,
    timestamp: new Date().toISOString(),
    report: count + 1,
  };

  db.data.queues.push(newEntry);
  await db.write();

  console.log("✅ New report saved:", newEntry); // Log saved report
  res.send({ status: "ok" });
});

// GET: Return full list of individual queue reports
app.get("/api/queues", async (req, res) => {
  await db.read();
  res.json(db.data.queues);
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
