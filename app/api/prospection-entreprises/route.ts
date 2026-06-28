// ============================================================
// GET /api/prospection-entreprises?code_postal=...&taille=...&secteur=...
//
// Interroge l'API officielle "Recherche d'Entreprises" de l'État
// (recherche-entreprises.api.gouv.fr, base SIRENE/INSEE, gratuite).
// Renvoie des sièges sociaux actifs dans le Gard (30) ou l'Hérault (34).
// ============================================================

import { NextResponse } from 'next/server';
import { EFFECTIF_LABELS } from '@/lib/entreprises';
import { fetchRetry } from '@/lib/fetch-retry';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const ALLOWED_DEPTS = ['30', '34'] as const;
const MAX_LIMIT = 25;

interface SireneEtab {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  etat_administratif?: string;
}

interface SearchResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  section_activite_principale?: string;
  tranche_effectif_salarie?: string;
  categorie_entreprise?: string;
  siege?: SireneEtab;
  matching_etablissements?: SireneEtab[];
}

interface ApiResponse {
  results: SearchResult[];
  total_results: number;
  page: number;
}

export interface EntrepriseAddress {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  entreprise: {
    siren: string;
    nom: string;
    naf: string;
    section: string;
    effectif: string;
    effectif_label: string;
    categorie: string;
  };
}

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codePostal = searchParams.get('code_postal')?.trim() ?? '';
  const dept = searchParams.get('dept')?.trim() ?? '';
  const commune = searchParams.get('commune')?.trim() ?? '';
  const ville = searchParams.get('ville')?.trim() ?? '';
  const taille = searchParams.get('taille')?.trim() ?? '';
  const secteur = searchParams.get('secteur')?.trim() ?? '';
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') ?? 20), 1),
    MAX_LIMIT,
  );

  if (!codePostal && !dept && !ville) {
    return NextResponse.json(
      { error: 'Renseigne un département (30 ou 34), un code postal ou une ville.' },
      { status: 400 },
    );
  }

  if (codePostal) {
    const deptFromCP = codePostal.substring(0, 2);
    if (!ALLOWED_DEPTS.includes(deptFromCP as (typeof ALLOWED_DEPTS)[number])) {
      return NextResponse.json(
        { error: `Le code postal ${codePostal} n'est pas dans le Gard (30) ou l'Hérault (34).` },
        { status: 400 },
      );
    }
  }

  if (dept && !ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number])) {
    return NextResponse.json(
      { error: `Département ${dept} non pris en charge. Seuls le Gard (30) et l'Hérault (34) sont disponibles.` },
      { status: 400 },
    );
  }

  const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
  if (codePostal) {
    url.searchParams.set('code_postal', codePostal);
  } else if (dept) {
    url.searchParams.set('departement', dept);
    if (commune) url.searchParams.set('q', commune);
  } else {
    url.searchParams.set('departement', '30,34');
    if (ville) url.searchParams.set('q', ville);
  }
  if (taille) url.searchParams.set('categorie_entreprise', taille);
  if (secteur) url.searchParams.set('section_activite_principale', secteur);
  url.searchParams.set('etat_administratif', 'A');
  url.searchParams.set('per_page', '25');

  function etabEnZone(e: SireneEtab | undefined): boolean {
    if (!e?.adresse) return false;
    const dept = (e.code_postal ?? '').substring(0, 2);
    return ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number]);
  }

  try {
    const r = await fetchRetry(url.toString(), {
      cache: 'no-store',
      headers: { 'User-Agent': 'energies-concept-mvp' },
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: `API SIRENE indisponible (${r.status}).` },
        { status: 502 },
      );
    }
    const data = (await r.json()) as ApiResponse;

    const entreprises: EntrepriseAddress[] = data.results
      .map((e) => {
        // On veut l'ADRESSE LOCALE du bâtiment (pas le siège national).
        // matching_etablissements = établissements qui matchent la zone
        // recherchée ; on retombe sur le siège seulement s'il est en zone.
        const local =
          (e.matching_etablissements ?? []).find(
            (et) =>
              etabEnZone(et) && (et.etat_administratif ?? 'A') === 'A',
          ) ?? (etabEnZone(e.siege) ? e.siege : undefined);
        if (!local) return null;

        const lat = toNumber(local.latitude);
        const lng = toNumber(local.longitude);
        if (lat === null || lng === null) return null;

        const postcode = local.code_postal ?? '';
        const nom = e.nom_raison_sociale ?? e.nom_complet ?? 'Entreprise';
        const adresse = (local.adresse ?? '').trim();
        const commune = local.libelle_commune ?? '';
        const section = e.section_activite_principale ?? '';
        const effectif = e.tranche_effectif_salarie ?? '';

        return {
          label: adresse || `${commune} ${postcode}`.trim(),
          city: commune,
          postcode,
          lat,
          lng,
          entreprise: {
            siren: e.siren,
            nom,
            naf: e.activite_principale ?? '',
            section,
            effectif,
            effectif_label:
              EFFECTIF_LABELS[effectif] ?? effectif ?? '',
            categorie: e.categorie_entreprise ?? '',
          },
        };
      })
      .filter((x): x is EntrepriseAddress => x !== null)
      .slice(0, limit);

    return NextResponse.json({
      entreprises,
      count: entreprises.length,
      total: data.total_results,
    });
  } catch {
    return NextResponse.json(
      { error: 'Recherche entreprise impossible.' },
      { status: 502 },
    );
  }
}
