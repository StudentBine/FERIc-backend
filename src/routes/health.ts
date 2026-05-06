import { Router } from 'express';
import { getAllPrograms } from '../programs';
import { getMeta } from '../firebase';

const router = Router();

router.get('/', async (_req, res) => {
  const programs = getAllPrograms();

  const syncStatus = await Promise.all(
    programs.map(async (p) => {
      const meta = await getMeta(p.id).catch(() => null);
      return { id: p.id, lastSync: meta?.lastSync ?? null };
    })
  );

  res.json({ status: 'ok', programs: syncStatus });
});

export default router;
