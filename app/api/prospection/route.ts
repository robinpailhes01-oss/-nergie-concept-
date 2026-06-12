// ============================================================
// GET /api/prospection?q=...&limit=...
//
// Pipeline en 2 étapes (BAN ne liste pas les numéros d'une rue
// en une seule requête) :
//   1. Localiser la rue (search → type=street)
//   2. Énumérer les numéros 1..N en parallèle pour récupérer
//      les housenumbers réels
//
// Filtre strict Gard (30) + Hérault (34). API BAN gratuite.
// ============================================================

import { NextResponse } from 'next/server';
import { fetchRetry } from '@/lib/fetch-retry';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    housenumber?: string;
    street?: string;
    name: string;
    city: string;
    postcode: string;
    citycode: string;
    type: string;
    score: number;
  };
}

interface BanResponse {
  features: BanFeature[];
}

export interface ProspectionAddress {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
}

const ALLOWED_DEPTS = ['30', '34'] as const;
const MAX_LIMIT = 30;
const PARALLEL = 8;
const MAX_TRY_MULTIPLIER = 3;

async function banSearch(q: string, type?: string): Promise<BanFeature[]> {
  const url = new URL('https://api-adresse.data.gouv.fr/search/');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', type === 'street' ? '5' : '1');
  url.searchParams.set('autocomplete', '0');
  if (type) url.searchParams.set('type', type);

  const r = await fetchRetry(url.toString(), {
    cache: 'no-store',
    headers: { 'User-Agent': 'energies-concept-mvp' },
  });
  if (!r.ok) return [];
  const data = (await r.json()) as BanResponse;
  return data.features;
}

async function findStreet(q: string): Promise<BanFeature | null> {
  // Cherche un street ; sinon repli sur premier résultat
  const streets = await banSearch(q, 'street');
  const top = streets.find((f) => {
    const dept = f.properties.postcode.substring(0, 2);
    return ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number]);
  });
  if (top) return top;

  // Fallback : premier résultat tous types confondus
  const any = await banSearch(q);
  return any[0] ?? null;
}

async function lookupHouseNumber(
  n: number,
  street: string,
  city: string,
  postcode: string,
): Promise<ProspectionAddress | null> {
  const q = `${n} ${street} ${postcode} ${city}`;
  const features = await banSearch(q, 'housenumber');
  const top = features[0];
  if (!top) return null;
  const p = top.properties;
  if (p.housenumber !== String(n)) return null;
  if (p.postcode !== postcode) return null;
  if (p.score < 0.65) return null;
  return {
    label: p.label,
    city: p.city,
    postcode: p.postcode,
    lat: top.geometry.coordinates[1] ?? 0,
    lng: top.geometry.coordinates[0] ?? 0,
  };
}

async function enumerateInParallel(
  street: string,
  city: string,
  postcode: string,
  target: number,
): Promise<ProspectionAddress[]> {
  const maxTry = Math.min(target * MAX_TRY_MULTIPLIER, 90);
  const candidates = Array.from({ length: maxTry }, (_, i) => i + 1);
  const found: ProspectionAddress[] = [];

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < candidates.length && found.length < target) {
      const i = cursor++;
      const n = candidates[i];
      if (n === undefined) break;
      const addr = await lookupHouseNumber(n, street, city, postcode);
      if (addr && found.length < target) found.push(addr);
    }
  }

  await Promise.all(Array.from({ length: PARALLEL }, () => worker()));
  return found;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') ?? 10), 1),
    MAX_LIMIT,
  );

  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: 'Requête trop courte (3 caractères min.)' },
      { status: 400 },
    );
  }

  // Étape 1 — localiser la rue
  const street = await findStreet(q);
  if (!street) {
    return NextResponse.json(
      { error: "Rue introuvable. Essaie : « rue X, ville »." },
      { status: 404 },
    );
  }

  const p = street.properties;
  const dept = p.postcode.substring(0, 2);
  if (!ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number])) {
    return NextResponse.json(
      {
        error: `Cette commune est dans le département ${dept}. Ce scanner ne couvre que le Gard (30) et l'Hérault (34).`,
      },
      { status: 400 },
    );
  }

  // Si l'utilisateur a tapé directement un numéro précis,
  // BAN renvoie déjà un housenumber → on l'inclut.
  const initialList: ProspectionAddress[] = [];
  if (p.type === 'housenumber' && p.housenumber) {
    initialList.push({
      label: p.label,
      city: p.city,
      postcode: p.postcode,
      lat: street.geometry.coordinates[1] ?? 0,
      lng: street.geometry.coordinates[0] ?? 0,
    });
  }

  const streetName = p.street ?? p.name ?? '';
  if (!streetName) {
    return NextResponse.json(
      { error: 'Nom de rue non identifiable.' },
      { status: 404 },
    );
  }

  // Étape 2 — énumérer les numéros
  const enumerated = await enumerateInParallel(
    streetName,
    p.city,
    p.postcode,
    limit - initialList.length,
  );

  // Fusion + déduplication par label
  const merged = [...initialList, ...enumerated]
    .filter((a, i, arr) => arr.findIndex((x) => x.label === a.label) === i)
    .slice(0, limit);

  if (merged.length === 0) {
    return NextResponse.json(
      {
        error: `Rue trouvée (${streetName}, ${p.city}) mais aucun numéro indexé par la BAN. Essaie une autre rue.`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    addresses: merged,
    count: merged.length,
    street: streetName,
    city: p.city,
    postcode: p.postcode,
  });
}
