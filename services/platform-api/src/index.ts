import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { assertAuthConfigured } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import projectsRouter from './routes/projects.js';
import scenesRouter from './routes/scenes.js';
import shotsRouter from './routes/shots.js';
import charactersRouter from './routes/characters.js';
import assetsRouter from './routes/assets.js';
import uploadRouter from './routes/upload.js';
import socialRouter from './routes/social.js';
import repurposeRouter from './routes/repurpose.js';
import { performanceMonitor, metricsRouter } from './middleware/performanceMonitor.js';
import devportalRouter from './routes/devportal.js';
import onboardingRouter from './routes/onboarding.js';
import verifyRouter from './routes/verify.js';
import cdnRouter from './routes/cdn.js';
// Seven routers existed but were never mounted, so their endpoints were
// unreachable in production even though each had a passing test suite (the
// suites mount the router themselves). #58 needs several of them.
import brandKitRouter from './routes/brandKit.js';
import humanReviewRouter from './routes/humanReview.js';
import pluginsRouter from './routes/plugins.js';
import receiptsRouter from './routes/receipts.js';
import reproducibilityRouter from './routes/reproducibility.js';
import reviewsRouter from './routes/reviews.js';
import worldBibleRouter from './routes/worldBible.js';
// Console persistence (#58).
import consoleResourcesRouter from './routes/console/resources.js';
import consoleAccountRouter from './routes/console/account.js';
import consoleProductionRouter from './routes/console/production.js';
import consoleTeamRouter from './routes/console/team.js';
import consoleMarketRouter from './routes/console/market.js';
import consoleInsightsRouter from './routes/console/insights.js';
import consoleDiscoveryRouter from './routes/console/discovery.js';
import { stripIdentityHeaders } from './middleware/stripIdentityHeaders.js';

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(stripIdentityHeaders);
app.use(morgan('combined'));
app.use(express.json());
app.use(performanceMonitor);

// Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', projectsRouter);
app.use('/api/v1', scenesRouter);
app.use('/api/v1', shotsRouter);
app.use('/api/v1', charactersRouter);
app.use('/api/v1', assetsRouter);
app.use('/api/v1', uploadRouter);
app.use('/api/v1', socialRouter);
app.use('/api/v1', repurposeRouter);
app.use('/api/v1', devportalRouter);
app.use('/api/v1', onboardingRouter);
app.use('/api/v1', verifyRouter);
app.use('/api/v1', cdnRouter);
app.use('/api/v1', brandKitRouter);
app.use('/api/v1', humanReviewRouter);
app.use('/api/v1', pluginsRouter);
app.use('/api/v1', receiptsRouter);
app.use('/api/v1', reproducibilityRouter);
app.use('/api/v1', reviewsRouter);
app.use('/api/v1', worldBibleRouter);
app.use('/api/v1', consoleResourcesRouter);
app.use('/api/v1', consoleAccountRouter);
app.use('/api/v1', consoleProductionRouter);
app.use('/api/v1', consoleTeamRouter);
app.use('/api/v1', consoleMarketRouter);
app.use('/api/v1', consoleInsightsRouter);
app.use('/api/v1', consoleDiscoveryRouter);
app.use('/api/v1', metricsRouter());

// Global error handler (must be registered after routes)
app.use(errorHandler);

// Start server only when this module is run directly (not imported for tests)
if (process.env.NODE_ENV !== 'test') {
  // Refuse to serve traffic without a signing secret. Every authenticated
  // route verifies against it; starting without one would mean either
  // 401-ing every request or -- as this service did until #82 -- accepting
  // unsigned tokens. Dying here names the cause once, at boot.
  try {
    assertAuthConfigured();
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  app.listen(config.port, () => {
    logger.info(`Platform API listening on port ${config.port}`);
  });
}

export default app;
