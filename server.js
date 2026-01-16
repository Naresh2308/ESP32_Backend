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

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(process.env.COLLECTION_NAME);

    // ✅ Test route
    app.get("/", (req, res) => {
      res.json({ status: "Backend is running ✅" });
    });

    // ✅ ESP32 will hit this endpoint
    app.post("/api/sensor", async (req, res) => {
      try {
        const { device, temperature, humidity } = req.body;

        if (!device || temperature === undefined || humidity === undefined) {
          return res.status(400).json({ error: "Missing fields" });
        }

        const doc = {
          device,
          temperature,
          humidity,
          timestamp: new Date(),
        };

        const result = await collection.insertOne(doc);

        res.json({
          message: "✅ Data inserted successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error("❌ Insert Error:", err);
        res.status(500).json({ error: "Insert failed" });
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
