import { Router } from 'express';
import { getAllPrograms } from '../programs';

const router = Router();

// GET /api/programs — returns [{ value, text }] (same shape as old WiseTimetable backend)
router.get('/', (_req, res) => {
  const programs = getAllPrograms().map(({ value, text }) => ({ value, text }));
  res.json(programs);
});

export default router;
