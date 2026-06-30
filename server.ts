import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import issuesRouter, { userTokens } from "./backend/routes/issues.ts";
import { Report } from "./backend/models/Report.ts";
import { seedData } from "./backend/seed.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configuration middlewares
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Auto-seed on startup if data file is empty or doesn't exist
  try {
    const existingReports = await Report.find({});
    if (existingReports.length === 0) {
      console.log("No complaints found. Triggering automated national seeder...");
      await seedData();
    }
  } catch (err) {
    console.error("Auto-seeding check failed:", err);
  }

  // API Router registration
  app.use("/api/issues", issuesRouter);

  // Health check and diagnostic API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", systemTime: new Date().toISOString(), platform: "Community Hero Municipal Dispatch Engine" });
  });

  // Database manual reseeding endpoint
  app.post("/api/issues/reseed", async (req, res) => {
    try {
      await seedData();
      const updated = await Report.find({});
      res.json({ success: true, message: "Municipal database reseeded successfully.", data: updated });
    } catch (err: any) {
      res.status(500).json({ error: "Reseed failed: " + err.message });
    }
  });

  // Register FCM Token
  app.post("/api/users/fcm-token", (req, res) => {
    const { email, token } = req.body;
    if (email && token) {
      userTokens[email] = token;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Missing email or token" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Running in development mode. Mounting Vite dev middleware...");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Running in production mode. Serving static files from 'dist'...");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Community Hero Server] live and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
