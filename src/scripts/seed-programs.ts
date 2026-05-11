// Seed script — run once with: npx tsx src/scripts/seed-programs.ts
// Populates degrees / programs / years in Firebase so the edit-profile
// screen can show the correct dropdowns.

import * as admin from 'firebase-admin';
import { initFirebase } from '../firebase';

initFirebase();
const db = admin.database();

// ---- Degrees ----

const degrees = [
  { id: 'vs',  label: 'Visokošolski strokovni (VS)', order: 1 },
  { id: 'un',  label: 'Univerzitetni (UN)',           order: 2 },
  { id: 'mag', label: 'Magistrski (MAG)',             order: 3 },
  { id: 'dr',  label: 'Doktorski',                    order: 4 },
];

// ---- Programs grouped by degree ----

const programs: Record<string, object[]> = {
  vs: [
    { id: 'BV10', name: 'Elektrotehnika',                                    abbreviation: 'ET VS',   code: 'BV10', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BV30', name: 'Informatika in tehnologije komuniciranja',           abbreviation: 'ITK VS',  code: 'BV30', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BV70', name: 'Mehatronika',                                        abbreviation: 'MEH VS',  code: 'BV70', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BV20', name: 'Računalništvo in informacijske tehnologije',         abbreviation: 'RIT VS',  code: 'BV20', active: true, faculty: 'FERI', duration: 3 },
  ],
  un: [
    { id: 'BU10', name: 'Elektrotehnika',                                    abbreviation: 'ET UN',   code: 'BU10', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BU80', name: 'Informatika in podatkovne tehnologije',              abbreviation: 'IPT UN',  code: 'BU80', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BU50', name: 'Medijske komunikacije',                              abbreviation: 'MK UN',   code: 'BU50', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BU70', name: 'Mehatronika',                                        abbreviation: 'MEH UN',  code: 'BU70', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BU20', name: 'Računalništvo in informacijske tehnologije',         abbreviation: 'RIT UN',  code: 'BU20', active: true, faculty: 'FERI', duration: 3 },
    { id: 'BU40', name: 'Telekomunikacije',                                   abbreviation: 'TK UN',   code: 'BU40', active: true, faculty: 'FERI', duration: 3 },
  ],
  mag: [
    { id: 'BM10',  name: 'Elektrotehnika',                                   abbreviation: 'ET MAG',  code: 'BM10',  active: true, faculty: 'FERI', duration: 2 },
    { id: 'BM80',  name: 'Informatika in podatkovne tehnologije',             abbreviation: 'IPT MAG', code: 'BM80',  active: true, faculty: 'FERI', duration: 2 },
    { id: 'BM50',  name: 'Medijske komunikacije',                             abbreviation: 'MK MAG',  code: 'BM50',  active: true, faculty: 'FERI', duration: 2 },
    { id: 'BMM7',  name: 'Mehatronika',                                       abbreviation: 'MEH MAG', code: 'BMM7',  active: true, faculty: 'FERI', duration: 2 },
    { id: 'BM20',  name: 'Računalništvo in informacijske tehnologije',        abbreviation: 'RIT MAG', code: 'BM20',  active: true, faculty: 'FERI', duration: 2 },
    { id: 'BM40',  name: 'Telekomunikacije',                                  abbreviation: 'TK MAG',  code: 'BM40',  active: true, faculty: 'FERI', duration: 2 },
  ],
  dr: [
    { id: 'DR',    name: 'Doktorski študij',                                  abbreviation: 'DR',      code: 'DR',    active: true, faculty: 'FERI', duration: 4 },
  ],
};

// ---- Years per degree ----

const years: Record<string, object[]> = {
  vs:  [{ id: '1', label: '1. letnik', order: 1 }, { id: '2', label: '2. letnik', order: 2 }, { id: '3', label: '3. letnik', order: 3 }],
  un:  [{ id: '1', label: '1. letnik', order: 1 }, { id: '2', label: '2. letnik', order: 2 }, { id: '3', label: '3. letnik', order: 3 }],
  mag: [{ id: '1', label: '1. letnik', order: 1 }, { id: '2', label: '2. letnik', order: 2 }],
  dr:  [{ id: '1', label: '1. letnik', order: 1 }, { id: '2', label: '2. letnik', order: 2 }, { id: '3', label: '3. letnik', order: 3 }, { id: '4', label: '4. letnik', order: 4 }],
};

// ---- Write ----

async function seed() {
  await db.ref('degrees').set(degrees);
  console.log('✓ degrees');

  for (const [degreeId, progs] of Object.entries(programs)) {
    await db.ref(`programs/${degreeId}`).set(progs);
    console.log(`✓ programs/${degreeId}`);
  }

  for (const [degreeId, yrs] of Object.entries(years)) {
    await db.ref(`years/${degreeId}`).set(yrs);
    console.log(`✓ years/${degreeId}`);
  }

  console.log('\nDone — Firebase is seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
