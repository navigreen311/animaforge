import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import c2paRoutes from "./routes/c2pa";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3006;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/governance/c2pa", c2paRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "c2pa-signing" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`C2PA Signing Service running on port ${PORT}`);
  });
}

export default app;
