import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initFirebase, getGroups } from './firebase';

import healthRouter from './routes/health';
import programsRouter from './routes/programs';
import timetableRouter from './routes/timetable';
import syncRouter from './routes/sync';

// ---- Bootstrap ----

initFirebase();

const app = express();

app.use(cors());
app.use(express.json());

// ---- Routes ----

app.use('/health', healthRouter);
app.use('/api/programs', programsRouter);

// POST /api/groups { programId } — mirrors old WiseTimetable contract
app.post('/api/groups', async (req, res) => {
  const { programId } = req.body as { programId?: string };
  if (!programId) { res.status(400).json({ error: 'programId is required' }); return; }
  const groups = await getGroups(programId);
  res.json(groups.map((g) => ({ id: g, text: g })));
});

app.use('/api/timetable', timetableRouter);
app.use('/api/sync', syncRouter);

// ---- Start ----

app.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
  // Sync runs via GitHub Actions (.github/workflows/sync.yml) — not in-process.
});

export default app;
