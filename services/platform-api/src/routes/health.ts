import { Router } from "express";
import { config } from "../config/index.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: config.version,
    timestamp: new Date().toISOString(),
  });
});

export default router;
