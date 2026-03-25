import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import talentRouter from "./routes/talent";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3018;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/talent", talentRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "talent", timestamp: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Talent Manager] listening on port ${PORT}`);
  });
}

export default app;
