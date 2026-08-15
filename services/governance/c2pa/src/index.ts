import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import c2paRoutes from './routes/c2pa';
import { getCapabilities } from './services/c2paService';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3006;

app.use(helmet());
app.use(cors());
// Assets are signed inline, so the default 100kb JSON cap is far too small.
app.use(express.json({ limit: process.env.C2PA_JSON_LIMIT ?? '96mb' }));

app.use('/governance/c2pa', c2paRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'c2pa-signing' });
});

/** Health plus the true state of the signer, so "degraded" is never silent. */
app.get('/health/detailed', async (_req, res) => {
  const capabilities = await getCapabilities();
  res.status(200).json({
    status: capabilities.degraded ? 'degraded' : 'ok',
    service: 'c2pa-signing',
    capabilities,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`C2PA Signing Service running on port ${PORT}`);
  });
}

export default app;
