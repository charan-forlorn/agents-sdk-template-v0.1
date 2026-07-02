import cors from 'cors';
import express from 'express';
import { streamLaunchPlan } from './routes/agentRoute.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'launch-desk-api',
      model: process.env.LAUNCH_DESK_MODEL || 'gpt-5.4-mini',
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    });
  });

  app.post('/api/agent/launch-plan', streamLaunchPlan);

  return app;
}
