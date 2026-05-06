// One-shot script — run with: npm run sync
// Syncs all configured programmes immediately, useful for initial load and debugging.

import { initFirebase } from '../firebase';
import { getAllPrograms } from '../programs';
import { syncAll } from '../services/sync';

initFirebase();

const programs = getAllPrograms();

if (programs.length === 0) {
  console.error('No programs configured. Add entries to src/programs.ts first.');
  process.exit(1);
}

console.log(`Syncing ${programs.length} program(s)…`);

syncAll(programs)
  .then((results) => {
    for (const r of results) {
      const tag = r.skipped ? 'SKIPPED' : 'SYNCED';
      console.log(`[${tag}] ${r.programId}: ${r.eventsStored} events, ${r.changesDetected} changes`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
