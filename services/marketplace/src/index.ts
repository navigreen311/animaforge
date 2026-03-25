import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import marketplaceRouter from "./routes/marketplace";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3017;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/marketplace", marketplaceRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "marketplace", timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Marketplace] listening on port ${PORT}`);
  });
}

export default app;
