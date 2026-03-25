import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import moderationRoutes from "./routes/moderation";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(moderationRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "moderation" });
});

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Moderation service running on port ${PORT}`);
  });
}
