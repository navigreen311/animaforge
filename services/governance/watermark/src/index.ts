import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import watermarkRoutes from './routes/watermark';
import { getCapabilities } from './services/watermarkService';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3007;

app.use(helmet());
app.use(cors());
// Watermarking takes media inline, so the default 100kb JSON cap is far too small.
app.use(express.json({ limit: process.env.WATERMARK_JSON_LIMIT ?? '96mb' }));

app.use(watermarkRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'watermark' });
});

/** Health plus the true state of every optional dependency. */
app.get('/health/detailed', async (_req, res) => {
  const capabilities = await getCapabilities();
  res.json({
    status: capabilities.degraded ? 'degraded' : 'ok',
    service: 'watermark',
    capabilities,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Watermark service listening on port ${PORT}`);
  });
}

export default app;
