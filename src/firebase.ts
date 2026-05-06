import * as admin from 'firebase-admin';
import { config } from './config';
import type { ScheduleEvent, SyncMeta, ScheduleChange } from './types';

// ---- Initialisation (called once at startup) ----

export function initFirebase(): void {
  if (admin.apps.length > 0) return;

  const serviceAccount = JSON.parse(
    Buffer.from(config.firebaseServiceAccount, 'base64').toString('utf-8')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebaseDatabaseUrl,
  });

  console.log('[firebase] initialised');
}

// ---- Path helpers ----

const db = () => admin.database();

const paths = {
  meta: (programId: string) => `icalSchedule/${programId}/meta`,
  events: (programId: string) => `icalSchedule/${programId}/events`,
  changes: (programId: string) => `icalSchedule/${programId}/changes`,
  groups: (programId: string) => `icalSchedule/${programId}/groups`,
};

// ---- Read ----

export async function getMeta(programId: string): Promise<SyncMeta | null> {
  const snap = await db().ref(paths.meta(programId)).get();
  return snap.exists() ? (snap.val() as SyncMeta) : null;
}

export async function getEvents(programId: string): Promise<Record<string, ScheduleEvent>> {
  const snap = await db().ref(paths.events(programId)).get();
  return snap.exists() ? (snap.val() as Record<string, ScheduleEvent>) : {};
}

export async function getChanges(programId: string, since?: number): Promise<ScheduleChange[]> {
  let ref = db().ref(paths.changes(programId)).orderByChild('detectedAt');
  if (since) ref = ref.startAt(since) as admin.database.Query;
  const snap = await ref.get();
  if (!snap.exists()) return [];
  return Object.values(snap.val() as Record<string, ScheduleChange>);
}

export async function getGroups(programId: string): Promise<string[]> {
  const snap = await db().ref(paths.groups(programId)).get();
  return snap.exists() ? (snap.val() as string[]) : [];
}

// ---- Write ----

export async function saveSync(
  programId: string,
  meta: SyncMeta,
  events: Record<string, ScheduleEvent>,
  changes: ScheduleChange[],
  groups: string[]
): Promise<void> {
  const ref = db().ref(`icalSchedule/${programId}`);

  const changesMap: Record<string, ScheduleChange> = {};
  for (const c of changes) changesMap[c.id] = c;

  await ref.update({
    meta,
    events,
    groups,
    // Merge new changes into existing ones (don't overwrite history)
  });

  // Append changes individually so we don't nuke the history
  if (changes.length > 0) {
    const changesRef = db().ref(paths.changes(programId));
    for (const change of changes) {
      await changesRef.child(change.id).set(change);
    }
  }
}

// ---- Housekeeping ----

export async function pruneOldChanges(programId: string, keepMs: number): Promise<void> {
  const cutoff = Date.now() - keepMs;
  // Fetch all and filter in-memory — avoids needing a Firebase index on detectedAt
  const snap = await db().ref(paths.changes(programId)).get();
  if (!snap.exists()) return;

  const deletions: Promise<void>[] = [];
  snap.forEach((child) => {
    const record = child.val() as { detectedAt?: number };
    if (record.detectedAt && record.detectedAt < cutoff) {
      deletions.push(child.ref.remove());
    }
  });
  await Promise.all(deletions);
}
