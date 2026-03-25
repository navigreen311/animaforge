import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import billingRouter from "./routes/billing";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3004", 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "billing" });
});

app.use("/billing", billingRouter);

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Billing service listening on port ${PORT}`);
  });
}
