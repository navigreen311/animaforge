import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import watermarkRoutes from "./routes/watermark";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3007;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(watermarkRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "watermark" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Watermark service listening on port ${PORT}`);
  });
}

export default app;
