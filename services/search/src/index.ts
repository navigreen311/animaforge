import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import searchRoutes from "./routes/search";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/search", searchRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "search" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Search service running on port ${PORT}`);
  });
}

export default app;
