import cron from 'node-cron';
import { config } from '../config';
import { getAllPrograms } from '../programs';
import { syncAll } from './sync';

export function startCron(): void {
  const schedule = config.cronSchedule;

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid cron schedule: "${schedule}"`);
  }

  cron.schedule(schedule, async () => {
    console.log(`[cron] triggered at ${new Date().toISOString()}`);
    const programs = getAllPrograms();
    if (programs.length === 0) {
      console.warn('[cron] no programs configured — nothing to sync');
      return;
    }
    await syncAll(programs);
  });

  console.log(`[cron] scheduled: "${schedule}"`);
}
