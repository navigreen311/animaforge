import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { piracyRouter } from "./routes/piracy";
import { getCapabilities } from "./services/piracyService";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3016", 10);

app.use(cors());
// Assets are fingerprinted inline, so the default 100kb JSON cap is too small.
app.use(express.json({ limit: process.env.PIRACY_JSON_LIMIT ?? "96mb" }));

app.use(piracyRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "piracy-monitoring",
    timestamp: new Date().toISOString(),
  });
});

/** Health plus the true state of discovery, ffmpeg and the watermark service. */
app.get("/health/detailed", async (_req, res) => {
  const capabilities = await getCapabilities();
  res.json({
    status: capabilities.degraded ? "degraded" : "ok",
    service: "piracy-monitoring",
    timestamp: new Date().toISOString(),
    capabilities,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Piracy Monitoring] Server running on port ${PORT}`);
  });
}

export { app };
