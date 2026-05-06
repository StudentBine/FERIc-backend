import { Router } from 'express';
import { getAllPrograms, getProgram } from '../programs';
import { syncAll, syncProgram } from '../services/sync';

const router = Router();

// POST /api/sync — trigger full sync for all configured programmes
router.post('/', async (_req, res) => {
  const programs = getAllPrograms();
  if (programs.length === 0) {
    res.status(503).json({ error: 'No programs configured' });
    return;
  }
  const results = await syncAll(programs);
  res.json({ results });
});

// POST /api/sync/:programId — sync a single programme
router.post('/:programId', async (req, res) => {
  const program = getProgram(req.params.programId);
  if (!program) {
    res.status(404).json({ error: 'Program not found' });
    return;
  }
  const result = await syncProgram(program);
  res.json(result);
});

export default router;
