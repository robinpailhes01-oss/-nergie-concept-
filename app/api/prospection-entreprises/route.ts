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

interface SearchResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  section_activite_principale?: string;
  tranche_effectif_salarie?: string;
  categorie_entreprise?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  };
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
  const ville = searchParams.get('ville')?.trim() ?? '';
  const taille = searchParams.get('taille')?.trim() ?? '';
  const secteur = searchParams.get('secteur')?.trim() ?? '';
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') ?? 20), 1),
    MAX_LIMIT,
  );

  if (!codePostal && !ville) {
    return NextResponse.json(
      { error: 'Renseigne une ville ou un code postal.' },
      { status: 400 },
    );
  }

  if (codePostal) {
    const dept = codePostal.substring(0, 2);
    if (!ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number])) {
      return NextResponse.json(
        {
          error: `Le code postal ${codePostal} n'est pas dans le Gard (30) ou l'Hérault (34).`,
        },
        { status: 400 },
      );
    }
  }

  const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
  if (codePostal) {
    url.searchParams.set('code_postal', codePostal);
  } else {
    url.searchParams.set('departement', '30,34');
    if (ville) url.searchParams.set('q', ville);
  }
  if (taille) url.searchParams.set('categorie_entreprise', taille);
  if (secteur) url.searchParams.set('section_activite_principale', secteur);
  url.searchParams.set('etat_administratif', 'A');
  url.searchParams.set('est_siege', 'true');
  // Toujours demander le max : les sièges hors 30/34 (chaînes nationales
  // avec un établissement local) sont filtrés après coup
  url.searchParams.set('per_page', '25');

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
        const s = e.siege;
        if (!s) return null;
        const lat = toNumber(s.latitude);
        const lng = toNumber(s.longitude);
        if (lat === null || lng === null) return null;

        const postcode = s.code_postal ?? '';
        const dept = postcode.substring(0, 2);
        if (!ALLOWED_DEPTS.includes(dept as (typeof ALLOWED_DEPTS)[number])) {
          return null;
        }

        const nom = e.nom_raison_sociale ?? e.nom_complet ?? 'Entreprise';
        const adresse = (s.adresse ?? '').trim();
        const commune = s.libelle_commune ?? '';
        const section = e.section_activite_principale ?? '';
        const effectif = e.tranche_effectif_salarie ?? '';

        // s.adresse contient déjà code postal + commune → pas de re-concaténation
        const label = adresse || `${commune} ${postcode}`.trim();

        return {
          label,
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
