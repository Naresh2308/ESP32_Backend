import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const client = new MongoClient(process.env.MONGO_URI);

let deviceCommand = "IDLE";   // 🔹 stores command state

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(process.env.COLLECTION_NAME);

    // ✅ Health check
    app.get("/", (req, res) => {
      res.json({ status: "Backend is running ✅" });
    });

    /* =========================================
       1️⃣ Frontend triggers soil test
    ========================================== */
    app.post("/api/start-test", (req, res) => {
      deviceCommand = "START_TEST";
      console.log('Recieved start cmd');
      res.json({ message: "✅ Test command sent to device" });
    });

/* =========================================
   2️⃣ ESP32 polls for command
========================================== */
app.get("/api/device-command", (req, res) => {
  const current = deviceCommand;
  
  // Reset immediately so the next poll returns IDLE
  deviceCommand = "IDLE"; 

  res.json({ command: current });
  
  if (current !== "IDLE") {
    console.log(`Command ${current} picked up by device.`);
  }
});

    /* =========================================
   3️⃣ ESP32 sends test result
========================================== */
app.post("/api/results", async (req, res) => {
    console.log('--- Incoming Data Debug ---');
    console.log('Body:', req.body); // Check if this is empty

    try {
        const { Id, metals_detected } = req.body;

        // 1. Validation Check
        if (!Id || !metals_detected) {
            console.log("❌ Validation failed: Missing fields in JSON");
            return res.status(400).json({ error: "Missing fields" });
        }

        // 2. Database Connection Check
        if (!collection) {
            console.log("❌ MongoDB Error: Collection object is null or undefined");
            return res.status(500).json({ error: "Database not initialized" });
        }

        const doc = {
            Id,
            metals_detected,
            timestamp: new Date(),
        };

        // 3. Perform Insertion
        const result = await collection.insertOne(doc);
        
        console.log("✅ Successfully inserted into MongoDB. ID:", result.insertedId);

        deviceCommand = "IDLE";
        res.json({ message: "✅ Data inserted", id: result.insertedId });

    } catch (err) {
        console.error("❌ MongoDB Insert Error:", err);
        res.status(500).json({ error: "Insert failed", details: err.message });
    }
});

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();
