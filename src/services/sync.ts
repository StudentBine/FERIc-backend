import { config } from '../config';
import { getEvents, getMeta, saveSync, pruneOldChanges } from '../firebase';
import { downloadAndParse, extractGroups, indexByUid } from './ical';
import { computeDiff } from './diff';
import type { ProgramConfig, SyncResult } from '../types';

export async function syncProgram(program: ProgramConfig): Promise<SyncResult> {
  console.log(`[sync] starting → ${program.id}`);

  const { events: newEventsList, rawHash } = await downloadAndParse(program.pageUrl);

  // Skip if the file hasn't changed since last sync
  const meta = await getMeta(program.id);
  if (meta?.lastHash === rawHash) {
    console.log(`[sync] ${program.id} — unchanged (hash match), skipping`);
    return { programId: program.id, eventsStored: meta.eventCount, changesDetected: 0, skipped: true };
  }

  const newEvents = indexByUid(newEventsList);
  const oldEvents = await getEvents(program.id);

  const changes = computeDiff(oldEvents, newEvents);
  const groups = extractGroups(newEventsList);

  await saveSync(
    program.id,
    { lastSync: Date.now(), lastHash: rawHash, eventCount: newEventsList.length },
    newEvents,
    changes,
    groups
  );

  // Prune stale change history
  const keepMs = config.changeHistoryDays * 24 * 60 * 60 * 1000;
  await pruneOldChanges(program.id, keepMs);

  console.log(
    `[sync] ${program.id} — ${newEventsList.length} events, ${changes.length} changes`
  );

  return {
    programId: program.id,
    eventsStored: newEventsList.length,
    changesDetected: changes.length,
    skipped: false,
  };
}

export async function syncAll(programs: ProgramConfig[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const program of programs) {
    try {
      results.push(await syncProgram(program));
    } catch (err) {
      console.error(`[sync] ${program.id} failed:`, err);
      results.push({ programId: program.id, eventsStored: 0, changesDetected: 0, skipped: false });
    }
  }
  return results;
}
