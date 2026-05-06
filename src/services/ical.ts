import ical, { type VEvent } from 'node-ical';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as crypto from 'crypto';
import type { ScheduleEvent } from '../types';

// ---- JSF form scraper ----
// The WiseTimetable "iCal-vse" button submits a JSF form (mojarra.jsfcljs).
// It needs: 1) session cookie + ViewState from a GET of the page,
//           2) a POST to home.jsf with those values + the button param.

const USER_AGENT = 'Mozilla/5.0 (compatible; FERIcBot/1.0)';

function extractViewState(html: string): string {
  const m = html.match(/name="javax\.faces\.ViewState"[^>]+value="([^"]+)"/);
  if (!m) throw new Error('ViewState not found in page HTML');
  return m[1];
}

// Find the form parameter for the "iCal-vse" button dynamically, so we are
// not hardcoding the server-generated JSF component ID (e.g. form:j_idt249).
function extractIcalVseParam(html: string): string {
  // The link has title "Izvoz celotnega urnika" and its onclick contains the param.
  const byTitle = html.match(
    /title="[^"]*celotnega[^"]*"[^>]*onclick="mojarra\.jsfcljs[^{]+\{'(form:[^']+)':/i
  );
  if (byTitle) return byTitle[1];

  // Fallback: find any mojarra.jsfcljs param that sits just before "iCal-vse" text.
  const byLabel = html.match(
    /\{'(form:[^']+)':'[^']+'\},'_blank'\)[^<]*<button[^>]*>[^<]*<span[^>]*>\s*iCal-vse/i
  );
  if (byLabel) return byLabel[1];

  throw new Error('Could not locate iCal-vse button parameter in page HTML');
}

async function downloadIcs(pageUrl: string): Promise<string> {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, timeout: 20000 }));
  const headers = { 'User-Agent': USER_AGENT };

  // Step 1 — load the filter page to get JSESSIONID cookie + ViewState
  const { data: html } = await client.get<string>(pageUrl, { headers });

  const viewState = extractViewState(html);
  const buttonParam = extractIcalVseParam(html);
  console.log(`[ical] session ready — button param: ${buttonParam}`);

  // Step 2 — POST the form as if the user clicked "iCal-vse"
  const url = new URL(pageUrl);
  const formAction = `${url.origin}/wtt_um_feri/pages/home.jsf`;

  const body = new URLSearchParams({
    form: 'form',
    'javax.faces.ViewState': viewState,
    [buttonParam]: buttonParam,
  });

  const { data: ics } = await client.post<string>(formAction, body.toString(), {
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
  });

  if (!ics.includes('BEGIN:VCALENDAR')) {
    throw new Error(
      `Form POST did not return iCal data. Response starts with: ${ics.substring(0, 200)}`
    );
  }

  return ics;
}

// ---- Slovenian day names ----

const DAY_NAMES: Record<number, string> = {
  0: 'Nedelja',
  1: 'Ponedeljek',
  2: 'Torek',
  3: 'Sreda',
  4: 'Četrtek',
  5: 'Petek',
  6: 'Sobota',
};

// ---- Helpers ----

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ---- iCal parsing helpers ----

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\bPR\b/,               type: 'PR' },
  { pattern: /predavanj/i,           type: 'PR' },
  { pattern: /\bSV\b/,              type: 'SV' },
  { pattern: /seminar/i,             type: 'SV' },
  { pattern: /\bVAJE\b|\bP\b(?!\w)/, type: 'P' },
  { pattern: /vaje|praktič/i,        type: 'P' },
];

function detectType(text: string): string {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return 'OTHER';
}

function extractGroup(text: string): string {
  const patterns = [
    /skup(?:ina)?\s*(\d+\w*)/i,
    /\bsk\.\s*(\d+\w*)/i,
    /\bG(\d+)/,
    /\bgroup\s+(\d+\w*)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim();
  }
  return '';
}

function extractLecturer(description: string): string {
  const patterns = [
    /predavatelj[ice]*[:\s]+([^\n\r,]+)/i,
    /profesor[ji]*[:\s]+([^\n\r,]+)/i,
    /izvajalec[:\s]+([^\n\r,]+)/i,
    /doc\.\s*dr\.[^\n\r,]*/i,
    /prof\.\s*dr\.[^\n\r,]*/i,
    /dr\.\s+[A-ZŠŽČ][a-zšžčćđ]+\s+[A-ZŠŽČ][a-zšžčćđ]+/,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) return (m[1] ?? m[0]).trim();
  }
  return '';
}

function cleanSubject(summary: string): string {
  return summary
    .replace(/\s*[-–]\s*(PR|SV|P|Predavanja|Seminarne\s+vaje|Praktičn\w+|Vaje)\b/gi, '')
    .replace(/\s*\((PR|SV|P)\)/gi, '')
    .replace(/skup(?:ina)?\s*\d+\w*/gi, '')
    .replace(/\bsk\.\s*\d+\w*/gi, '')
    .replace(/\bG\d+\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function safeUid(uid: string): string {
  return uid.replace(/[.#$[\]]/g, '_');
}

function toStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'val' in v) return String((v as { val: unknown }).val);
  return '';
}

// ---- Main download + parse ----

export async function downloadAndParse(
  pageUrl: string
): Promise<{ events: ScheduleEvent[]; rawHash: string }> {
  const icsContent = await downloadIcs(pageUrl);
  console.log(`[ical] received ${icsContent.length} bytes`);

  const rawHash = crypto.createHash('md5').update(icsContent).digest('hex');

  const raw = ical.sync.parseICS(icsContent);

  const events: ScheduleEvent[] = [];

  for (const component of Object.values(raw)) {
    if (!component || component.type !== 'VEVENT') continue;
    const e = component as VEvent;

    const start = e.start as Date;
    const end = e.end as Date;
    if (!(start instanceof Date) || isNaN(start.getTime())) continue;

    const summary = toStr(e.summary);
    const description = toStr(e.description as unknown);
    const location = toStr(e.location as unknown);
    const rawCats = (e.categories ?? []) as unknown[];
    const categories = rawCats.map((c) =>
      typeof c === 'string' ? c : (c as { val: string }).val ?? ''
    );
    const allText = `${summary} ${description}`;

    const type = detectType(allText) || (categories[0] ?? 'OTHER');
    const group = extractGroup(allText);
    const subject = cleanSubject(summary);
    const lecturer = extractLecturer(description);

    events.push({
      uid: safeUid(toStr(e.uid) || `${summary}-${start.toISOString()}`),
      subject,
      lecturer,
      room: location,
      group,
      type,
      day: DAY_NAMES[start.getDay()] ?? 'Neznan dan',
      time: `${formatTime(start)} - ${formatTime(end)}`,
      date: isoDate(start),
      weekNumber: isoWeek(start),
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    });
  }

  return { events, rawHash };
}

// ---- Group extraction ----

export function extractGroups(events: ScheduleEvent[]): string[] {
  const groups = new Set<string>();
  for (const e of events) {
    if (e.group) groups.add(e.group);
  }
  return Array.from(groups).sort();
}

// ---- Index events by uid for diffing ----

export function indexByUid(events: ScheduleEvent[]): Record<string, ScheduleEvent> {
  const map: Record<string, ScheduleEvent> = {};
  for (const e of events) map[e.uid] = e;
  return map;
}
