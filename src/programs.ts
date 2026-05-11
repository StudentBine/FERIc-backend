import type { ProgramConfig } from './types';

// Add every study programme here. The user supplies the .ical URL.
// The `id` is used as the URL path segment: GET /api/schedule/:id
// `value` and `text` mirror the old WiseTimetable contract so the frontend
// doesn't need to change its programs endpoint parsing.

export const PROGRAMS: ProgramConfig[] = [
  {
    id: 'itk',
    name: 'Informatika in tehnologije komuniciranja (ITK)',
    value: 'itk',
    text: 'Informatika in tehnologije komuniciranja (ITK)',
    pageUrl: 'https://www.wise-tt.com/wtt_um_feri/index.jsp?filterId=0;51;0;0;',
    codes: ['BV30'], // VS code — add 'BU80' here once you have the IPT UN URL
  },
];

export function getProgram(id: string): ProgramConfig | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export function getAllPrograms(): ProgramConfig[] {
  return PROGRAMS;
}
