import { Router } from 'express';
import { getEvents, getMeta, getChanges } from '../firebase';
import { PROGRAMS } from '../programs';
import type { ScheduleEvent, WeekData } from '../types';

const router = Router();

interface TimetableRequest {
  program: string;
  year?: string;
  groups: string[];
  week?: string; // ISO week number as string, e.g. "15"
}

// Resolve whatever the frontend sends (full name, code, or id) to a backend program id
function resolveProgram(raw: string): string {
  // Already a known backend ID
  if (PROGRAMS.find(p => p.id === raw)) return raw;
  // Extract "(CODE)" suffix — frontend sends "PROGRAM NAME (BV30)"
  const m = raw.match(/\(([A-Z0-9]+)\)\s*$/i);
  if (m) {
    const code = m[1].toUpperCase();
    const p = PROGRAMS.find(prog => prog.codes.some(c => c.toUpperCase() === code));
    if (p) return p.id;
  }
  // Partial name match as last resort
  const lower = raw.toLowerCase().split('(')[0].trim();
  const byName = PROGRAMS.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.id));
  return byName?.id ?? raw;
}

// Filter events by selected groups (empty array = return all)
function filterByGroups(events: ScheduleEvent[], groups: string[]): ScheduleEvent[] {
  if (!groups || groups.length === 0) return events;
  return events.filter((e) => !e.group || groups.some((g) => e.group.includes(g) || g.includes(e.group)));
}

// Group events into WeekData[] ordered by weekNumber
function groupByWeek(events: ScheduleEvent[]): WeekData[] {
  const map = new Map<number, ScheduleEvent[]>();
  for (const e of events) {
    const list = map.get(e.weekNumber) ?? [];
    list.push(e);
    map.set(e.weekNumber, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, weekEvents]) => ({
      week: `Teden ${weekNumber}`,
      weekNumber,
      events: weekEvents.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime)),
    }));
}

// POST /api/timetable — main schedule endpoint (mirrors old backend contract)
// Body: { program, year?, groups, week? }
// If `week` is omitted → returns AllWeeksResponse { weeks: WeekData[] }
// If `week` is provided → returns TimetableEntry[] for that week only
router.post('/', async (req, res) => {
  const body = req.body as TimetableRequest;
  const { program, groups, week } = body;

  if (!program) {
    res.status(400).json({ error: 'program is required' });
    return;
  }

  const programId = resolveProgram(program);
  console.log(`[timetable] resolved "${program}" → "${programId}"`);
  const eventsMap = await getEvents(programId);
  let events = Object.values(eventsMap);

  events = filterByGroups(events, groups ?? []);

  if (week) {
    const weekNum = parseInt(week, 10);
    const weekEvents = events
      .filter((e) => e.weekNumber === weekNum)
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
    res.json(weekEvents);
    return;
  }

  // No week filter — return all weeks
  const weeks = groupByWeek(events);
  res.json({ weeks });
});

// GET /api/timetable/:programId/changes?since=<unix_ms>
router.get('/:programId/changes', async (req, res) => {
  const { programId } = req.params;
  const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;

  const changes = await getChanges(programId, since);
  res.json({ changes, count: changes.length });
});

// GET /api/timetable/:programId/meta
router.get('/:programId/meta', async (req, res) => {
  const meta = await getMeta(req.params.programId);
  if (!meta) {
    res.status(404).json({ error: 'No sync data found for this program' });
    return;
  }
  res.json(meta);
});

export default router;
