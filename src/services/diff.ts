import * as crypto from 'crypto';
import type { ScheduleEvent, ScheduleChange, ChangeType } from '../types';

function shortId(): string {
  return crypto.randomBytes(6).toString('hex');
}

function timeChanged(a: ScheduleEvent, b: ScheduleEvent): boolean {
  return a.startDateTime !== b.startDateTime || a.endDateTime !== b.endDateTime;
}

function roomChanged(a: ScheduleEvent, b: ScheduleEvent): boolean {
  return a.room !== b.room;
}

export function computeDiff(
  oldEvents: Record<string, ScheduleEvent>,
  newEvents: Record<string, ScheduleEvent>
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];
  const now = Date.now();

  const oldKeys = new Set(Object.keys(oldEvents));
  const newKeys = new Set(Object.keys(newEvents));

  // Added
  for (const uid of newKeys) {
    if (!oldKeys.has(uid)) {
      changes.push({
        id: `${now}-${shortId()}`,
        type: 'ADDED',
        event: newEvents[uid],
        detectedAt: now,
      });
    }
  }

  // Removed
  for (const uid of oldKeys) {
    if (!newKeys.has(uid)) {
      changes.push({
        id: `${now}-${shortId()}`,
        type: 'REMOVED',
        event: oldEvents[uid],
        detectedAt: now,
      });
    }
  }

  // Modified — check events that exist in both
  for (const uid of newKeys) {
    if (!oldKeys.has(uid)) continue;

    const oldE = oldEvents[uid];
    const newE = newEvents[uid];
    let changeType: ChangeType | null = null;

    if (timeChanged(oldE, newE)) {
      changeType = 'TIME_CHANGED';
    } else if (roomChanged(oldE, newE)) {
      changeType = 'ROOM_CHANGED';
    }

    if (changeType) {
      changes.push({
        id: `${now}-${shortId()}`,
        type: changeType,
        event: newE,
        previousEvent: oldE,
        detectedAt: now,
      });
    }
  }

  return changes;
}
