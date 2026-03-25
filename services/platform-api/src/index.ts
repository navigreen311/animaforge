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

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Routes
app.use("/api/v1", healthRouter);

// Global error handler (must be registered after routes)
app.use(errorHandler);

// Start server only when this module is run directly (not imported for tests)
if (process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    logger.info(`Platform API listening on port ${config.port}`);
  });
}

export default app;
