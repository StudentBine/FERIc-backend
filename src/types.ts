// ---- Core schedule types (API-compatible with TimetableEntry in the frontend) ----

export interface ScheduleEvent {
  uid: string;
  // Fields that match the frontend's TimetableEntry
  day: string;        // "Ponedeljek", "Torek", …
  time: string;       // "08:00 - 10:00"
  subject: string;
  lecturer: string;
  room: string;
  group: string;
  type: string;       // "PR" | "SV" | "P" | "HOLIDAY"
  // Extra fields not in TimetableEntry
  date: string;       // ISO date "YYYY-MM-DD"
  weekNumber: number; // ISO week number
  startDateTime: string; // ISO 8601
  endDateTime: string;
}

// ---- Programs / groups (mirror the old WiseTimetable contract) ----

export interface ProgramConfig {
  id: string;
  name: string;       // Display name
  value: string;      // Same as id — used as the "value" field the frontend expects
  text: string;       // Same as name  — used as the "text" field
  // The page URL you copy from the browser — the iCal URL is derived from it automatically.
  // Example: https://www.wise-tt.com/wtt_um_feri/index.jsp?filterId=0;51;0;0;
  pageUrl: string;
}

export interface GroupInfo {
  id: string;
  text: string;
}

// ---- Firebase persistence ----

export interface SyncMeta {
  lastSync: number;   // Unix ms
  lastHash: string;
  eventCount: number;
}

export type ChangeType = 'ADDED' | 'REMOVED' | 'TIME_CHANGED' | 'ROOM_CHANGED';

export interface ScheduleChange {
  id: string;
  type: ChangeType;
  event: ScheduleEvent;
  previousEvent?: ScheduleEvent;
  detectedAt: number; // Unix ms
}

// ---- API response shapes ----

export interface WeekData {
  week: string;        // e.g. "Teden 3"
  weekNumber: number;
  events: ScheduleEvent[];
}

export interface AllWeeksResponse {
  weeks: WeekData[];
}

export interface SyncResult {
  programId: string;
  eventsStored: number;
  changesDetected: number;
  skipped: boolean;   // true when hash matched — no changes
}
