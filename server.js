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

let deviceCommand = "IDLE";

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(process.env.COLLECTION_NAME);

    // ==========================
    // HEALTH CHECK
    // ==========================
    app.get("/", (req, res) => {
      res.json({ status: "Backend is running ✅" });
    });

    // ==========================
    // 1️⃣ START TEST
    // ==========================
    app.post("/api/start-test", (req, res) => {
      deviceCommand = "START_TEST";
      console.log("START_TEST triggered");
      res.json({ message: "Test command sent" });
    });

    // ==========================
    // 2️⃣ DEVICE POLLING
    // ==========================
    app.get("/api/device-command", (req, res) => {
      res.json({ command: deviceCommand });

      if (deviceCommand !== "IDLE") {
        console.log(`Device polled: ${deviceCommand}`);
      }
    });

    // ==========================
    // 3️⃣ RECEIVE RESULTS
    // ==========================
    app.post("/api/results", async (req, res) => {

      console.log("Incoming Data:", req.body);

      try {
        const { Id, metals_detected } = req.body;

        if (!Id || !metals_detected) {
          return res.status(400).json({ error: "Missing fields" });
        }

        const doc = {
          Id,
          metals_detected,
          timestamp: new Date(),
        };

        const result = await collection.insertOne(doc);

        console.log("Inserted:", result.insertedId);

        // 🔥 RESET COMMAND ONLY AFTER RESULT
        deviceCommand = "IDLE";

        res.json({ message: "Data inserted" });

      } catch (err) {
        console.error("Insert error:", err);
        res.status(500).json({ error: "Insert failed" });
      }
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();
