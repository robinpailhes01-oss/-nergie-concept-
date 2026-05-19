// ============================================================
// Agrégations charts dashboard
// ============================================================

import type { Prospect } from '@/types';

export interface MonthlyBucket {
  mois: string;
  prospects: number;
  propositions: number;
  signes: number;
}

export interface WeeklyConversion {
  sem: string;
  taux: number;
}

const MOIS_COURT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

function weekOfYear(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

const COMMITTED: ReadonlyArray<Prospect['statut']> = [
  'proposition_envoyee',
  'visite_planifiee',
  'signe',
];

export function buildMonthly(
  prospects: Prospect[],
  months: number = 7,
): MonthlyBucket[] {
  const now = new Date();
  const buckets: MonthlyBucket[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      mois: MOIS_COURT[d.getMonth()] ?? '',
      prospects: 0,
      propositions: 0,
      signes: 0,
    });
    (buckets[buckets.length - 1] as MonthlyBucket & { _key?: string })._key = key;
  }

  for (const p of prospects) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.find(
      (x) => (x as MonthlyBucket & { _key?: string })._key === key,
    );
    if (!b) continue;
    b.prospects += 1;
    if (COMMITTED.includes(p.statut)) b.propositions += 1;
    if (p.statut === 'signe') b.signes += 1;
  }

  return buckets.map(({ mois, prospects, propositions, signes }) => ({
    mois,
    prospects,
    propositions,
    signes,
  }));
}

export function buildWeeklyConversion(
  prospects: Prospect[],
  weeks: number = 8,
): WeeklyConversion[] {
  const now = new Date();
  const buckets: Array<{
    sem: string;
    key: string;
    props: number;
    signes: number;
  }> = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const w = weekOfYear(d);
    buckets.push({
      sem: `S${w}`,
      key: `${d.getFullYear()}-${w}`,
      props: 0,
      signes: 0,
    });
  }

  for (const p of prospects) {
    if (!COMMITTED.includes(p.statut)) continue;
    const d = new Date(p.updated_at ?? p.created_at);
    const w = weekOfYear(d);
    const key = `${d.getFullYear()}-${w}`;
    const b = buckets.find((x) => x.key === key);
    if (!b) continue;
    b.props += 1;
    if (p.statut === 'signe') b.signes += 1;
  }

  return buckets.map((b) => ({
    sem: b.sem,
    taux: b.props === 0 ? 0 : Math.round((b.signes / b.props) * 100),
  }));
}

export function conversionMoyenne(data: WeeklyConversion[]): number {
  const nonzero = data.filter((d) => d.taux > 0);
  if (nonzero.length === 0) return 0;
  return Math.round(
    nonzero.reduce((s, d) => s + d.taux, 0) / nonzero.length,
  );
}
