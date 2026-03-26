import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import consentRoutes from "./routes/consent";
import rightsRouter from "./routes/rights";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3008;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(consentRoutes);
app.use(rightsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "consent" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Consent service listening on port ${PORT}`);
  });
}

export default app;
