import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import analyticsRoutes from "./routes/analytics";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/analytics", analyticsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "analytics" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Analytics service running on port ${PORT}`);
  });
}

export default app;
