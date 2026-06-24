// ============================================================
// Persistance démo côté navigateur (localStorage)
//
// Quand l'app tourne SANS Supabase (mode démo), les écritures
// serveur ne persistent pas (serverless stateless). Ce store
// garde les prospects ajoutés/modifiés dans le navigateur pour
// que le parcours commercial fonctionne de bout en bout pendant
// une démo, sans aucune base de données.
//
// Dès qu'un vrai Supabase est connecté (demo:false), ce store
// est totalement ignoré.
// ============================================================

import type { Prospect } from '@/types';

const KEY = 'ec_demo_prospects_v1';

function read(): Prospect[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Prospect[]) : [];
  } catch {
    return [];
  }
}

function write(list: Prospect[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — best effort */
  }
}

export function getLocalProspects(): Prospect[] {
  return read();
}

export function addLocalProspect(p: Prospect): void {
  const list = read();
  // évite les doublons d'id
  write([p, ...list.filter((x) => x.id !== p.id)]);
}

export function updateLocalProspect(
  id: string,
  patch: Partial<Prospect>,
): void {
  const list = read();
  const idx = list.findIndex((p) => p.id === id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const current = list[idx];
    if (current) {
      list[idx] = { ...current, ...patch, updated_at: now };
      write(list);
    }
  }
}

// Fusionne les prospects renvoyés par l'API (5 démos) avec ceux
// stockés localement (ajoutés/modifiés). La version locale prime.
export function mergeWithLocal(apiProspects: Prospect[]): Prospect[] {
  const local = read();
  const seen = new Set<string>();
  const out: Prospect[] = [];
  for (const p of [...local, ...apiProspects]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  // tri par date de création desc (comme le ferait Supabase)
  return out.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
