import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import lifecycleRouter from './routes/lifecycle';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3014', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'storage-lifecycle', timestamp: new Date().toISOString() });
});

// Mount lifecycle routes
app.use('/storage', lifecycleRouter);

// Only start the server when this file is run directly (not imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Storage Lifecycle service running on port ${PORT}`);
  });
}

export default app;
