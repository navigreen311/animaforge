import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { piracyRouter } from './routes/piracy';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3016', 10);

app.use(cors());
app.use(express.json());

app.use(piracyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'piracy-monitoring', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Piracy Monitoring] Server running on port ${PORT}`);
  });
}

export { app };
