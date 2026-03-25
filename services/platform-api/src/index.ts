import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import healthRouter from "./routes/health.js";
import projectsRouter from "./routes/projects.js";
import scenesRouter from "./routes/scenes.js";
import shotsRouter from "./routes/shots.js";
import charactersRouter from "./routes/characters.js";
import assetsRouter from "./routes/assets.js";
import uploadRouter from "./routes/upload.js";
import socialRouter from "./routes/social.js";
import repurposeRouter from "./routes/repurpose.js";
import { performanceMonitor, metricsRouter } from "./middleware/performanceMonitor.js";

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(performanceMonitor);

// Routes
app.use("/api/v1", healthRouter);
app.use("/api/v1", projectsRouter);
app.use("/api/v1", scenesRouter);
app.use("/api/v1", shotsRouter);
app.use("/api/v1", charactersRouter);
app.use("/api/v1", assetsRouter);
app.use("/api/v1", uploadRouter);
app.use("/api/v1", socialRouter);
app.use("/api/v1", repurposeRouter);
app.use("/api/v1", metricsRouter());

// Global error handler (must be registered after routes)
app.use(errorHandler);

// Start server only when this module is run directly (not imported for tests)
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    logger.info(`Platform API listening on port ${config.port}`);
  });
}

export default app;
