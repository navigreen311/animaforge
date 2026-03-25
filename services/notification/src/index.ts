import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import notificationRoutes from "./routes/notifications";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/notifications", notificationRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "notification" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Notification service running on port ${PORT}`);
  });
}

export default app;
