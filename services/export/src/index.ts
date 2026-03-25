import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import exportRouter from "./routes/export";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3013;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "export-engine", timestamp: new Date().toISOString() });
});

app.use(exportRouter);

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("Export Engine running on port " + PORT);
  });
}
