// ============================================================
// GET /api/installations-existantes
//
// Source : registre national des installations de production
// d'électricité (ODRÉ, open data — données Enedis/RTE).
// → entreprises qui ONT DÉJÀ une installation solaire (30/34).
//
// Le registre ne donne que la commune. Pour l'adresse exacte,
// on croise le nom d'installation avec la base SIRENE
// (recherche-entreprises.api.gouv.fr).
//
// Modes :
//   - liste enrichie (défaut)   : ?dept=34&tri=anciennes&limit=15
//   - names_only (pour le flag) : ?names_only=1&commune=Sète
// ============================================================

import { NextResponse } from 'next/server';
import {
  estOperateurSolaire,
  nafEstFiable,
  nettoyerNomInstallation,
  nomEstProjet,
  nomsCorrespondent,
} from '@/lib/entreprises';
import { fetchRetry } from '@/lib/fetch-retry';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ODRE_BASE =
  'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/registre-national-installation-production-stockage-electricite-agrege/records';

const MAX_LIMIT = 20;
const ENRICH_WORKERS = 4;

interface OdreRecord {
  nominstallation: string;
  commune: string;
  codeinseecommune: string | null;
  codedepartement: string;
  puismaxinstallee: number | null;
  datemiseenservice: string | null;
  datemiseenservice_date: string | null;
}

interface OdreResponse {
  total_count: number;
  results: OdreRecord[];
}

interface SireneEtablissement {
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  commune?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  activite_principale?: string;
  etat_administratif?: string;
}

interface SireneResult {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: SireneEtablissement;
  matching_etablissements?: SireneEtablissement[];
}

export interface InstallationExistante {
  nom_installation: string;
  commune: string;
  code_insee: string | null;
  departement: string;
  puissance_kw: number;
  date_mise_en_service: string | null;
  annee: number | null;
  entreprise: {
    nom: string;
    siren: string;
    adresse: string;
    code_postal: string;
    ville: string;
    lat: number | null;
    lng: number | null;
    naf: string;
    confiance: 'haute' | 'moyenne';
  } | null;
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

async function odreQuery(where: string, orderBy: string, limit: number) {
  const url = new URL(ODRE_BASE);
  url.searchParams.set('where', where);
  url.searchParams.set('order_by', orderBy);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'select',
    'nominstallation,commune,codeinseecommune,codedepartement,puismaxinstallee,datemiseenservice,datemiseenservice_date',
  );
  const r = await fetchRetry(url.toString(), {
    cache: 'no-store',
    headers: { 'User-Agent': 'energies-concept-mvp' },
  });
  if (!r.ok) throw new Error(`ODRE ${r.status}`);
  return (await r.json()) as OdreResponse;
}

async function enrichSirene(
  rec: OdreRecord,
): Promise<InstallationExistante['entreprise']> {
  const q = nettoyerNomInstallation(rec.nominstallation);
  if (!q || !rec.codeinseecommune) return null;

  // Requête ciblée sur la COMMUNE de l'installation : on veut l'adresse
  // du bâtiment équipé, pas le siège social national de l'enseigne.
  const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
  url.searchParams.set('q', q);
  url.searchParams.set('code_commune', rec.codeinseecommune);
  url.searchParams.set('etat_administratif', 'A');
  url.searchParams.set('per_page', '5');

  try {
    const r = await fetchRetry(url.toString(), {
      cache: 'no-store',
      headers: { 'User-Agent': 'energies-concept-mvp' },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { results: SireneResult[] };
    if (!data.results?.length) return null;

    // On cherche un établissement RÉELLEMENT situé dans la commune
    // de l'installation (matching_etablissements), pas le siège.
    for (const result of data.results) {
      const local = (result.matching_etablissements ?? []).find(
        (e) =>
          e.commune === rec.codeinseecommune &&
          e.adresse &&
          (e.etat_administratif ?? 'A') === 'A',
      );
      if (!local) continue;

      return {
        nom: result.nom_raison_sociale ?? result.nom_complet ?? q,
        siren: result.siren,
        adresse: (local.adresse ?? '').trim(),
        code_postal: local.code_postal ?? '',
        ville: local.libelle_commune ?? rec.commune,
        lat: toNum(local.latitude),
        lng: toNum(local.longitude),
        naf: local.activite_principale ?? '',
        confiance: 'haute',
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // --- Mode léger pour le flag "déjà équipée" du scanner B2B ---
  if (searchParams.get('names_only') === '1') {
    const commune = searchParams.get('commune')?.trim();
    if (!commune) {
      return NextResponse.json({ error: 'Paramètre commune requis' }, { status: 400 });
    }
    const safe = commune.replace(/"/g, '');
    const where = `codedepartement in ("30","34") and codefiliere="SOLAI" and regime="En service" and nominstallation is not null and search(commune,"${safe}")`;
    try {
      const data = await odreQuery(where, 'puismaxinstallee desc', 100);
      return NextResponse.json({
        commune,
        installations: data.results.map((r) => ({
          nom: r.nominstallation,
          puissance_kw: toNum(r.puismaxinstallee) ?? 0,
          annee: r.datemiseenservice_date
            ? Number(r.datemiseenservice_date.substring(0, 4))
            : null,
        })),
      });
    } catch {
      return NextResponse.json({ commune, installations: [] });
    }
  }

  // --- Mode liste enrichie ---
  const dept = searchParams.get('dept') ?? '34';
  const commune = searchParams.get('commune')?.trim() ?? '';
  const tri = searchParams.get('tri') ?? 'anciennes';
  const pmin = Math.max(Number(searchParams.get('pmin') ?? 9), 1);
  const pmax = Math.min(Number(searchParams.get('pmax') ?? 2000), 100000);
  const limit = Math.min(
    Math.max(Number(searchParams.get('limit') ?? 15), 1),
    MAX_LIMIT,
  );
  const strict = searchParams.get('strict') !== '0'; // défaut : strict ON

  const deptFilter =
    dept === '30' || dept === '34'
      ? `codedepartement="${dept}"`
      : 'codedepartement in ("30","34")';

  const clauses = [
    deptFilter,
    'codefiliere="SOLAI"',
    'regime="En service"',
    'nominstallation is not null',
    'not search(nominstallation,"confidentiel")',
    `puismaxinstallee>=${pmin}`,
    `puismaxinstallee<=${pmax}`,
  ];
  if (commune) {
    clauses.push(`search(commune,"${commune.replace(/"/g, '')}")`);
  }

  const orderBy =
    tri === 'puissance'
      ? 'puismaxinstallee desc'
      : tri === 'recentes'
        ? 'datemiseenservice_date desc'
        : 'datemiseenservice_date asc';

  // En mode strict, on tire 4× plus de candidats puis on filtre :
  // beaucoup d'installations seront rejetées (nom de projet, NAF non
  // fiable, pas de match SIRENE local).
  const fetchLimit = strict ? Math.min(limit * 4, 80) : limit;

  let data: OdreResponse;
  try {
    data = await odreQuery(clauses.join(' and '), orderBy, fetchLimit);
  } catch {
    return NextResponse.json(
      { error: 'Registre ODRÉ indisponible, réessayer dans un instant.' },
      { status: 502 },
    );
  }

  // En mode strict, on écarte d'emblée les noms d'installation qui
  // sont clairement des noms de projet (PARC, CENTRALE, SPV, AFRD…) :
  // pas la peine de gaspiller des requêtes SIRENE.
  const candidates = strict
    ? data.results.filter((r) => !nomEstProjet(r.nominstallation))
    : data.results;

  // Enrichissement SIRENE en parallèle limité
  const enriched: InstallationExistante[] = new Array(candidates.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < candidates.length) {
      const i = cursor++;
      const rec = candidates[i];
      if (!rec) continue;
      const entreprise = await enrichSirene(rec);
      enriched[i] = {
        nom_installation: rec.nominstallation,
        commune: rec.commune,
        code_insee: rec.codeinseecommune,
        departement: rec.codedepartement,
        puissance_kw: toNum(rec.puismaxinstallee) ?? 0,
        date_mise_en_service: rec.datemiseenservice,
        annee: rec.datemiseenservice_date
          ? Number(rec.datemiseenservice_date.substring(0, 4))
          : null,
        entreprise,
      };
    }
  }

  await Promise.all(
    Array.from({ length: ENRICH_WORKERS }, () => worker()),
  );

  let result = enriched.filter(Boolean);

  // En mode strict, on ne garde que les leads ULTRA fiables :
  //   - une entreprise SIRENE locale trouvée
  //   - son NAF est "propriétaire-occupant" (industrie, commerce…)
  //   - ce N'EST PAS un opérateur du solaire (installateur, SPV, loueur)
  //     qui pose sur le toit d'un autre
  //   - le nom d'entreprise et le nom d'installation se correspondent
  if (strict) {
    result = result.filter(
      (r) =>
        r.entreprise &&
        nafEstFiable(r.entreprise.naf) &&
        !estOperateurSolaire(r.entreprise.nom, r.entreprise.naf) &&
        nomsCorrespondent(r.entreprise.nom, r.nom_installation),
    );
  }

  return NextResponse.json({
    installations: result.slice(0, limit),
    count: result.length,
    total: data.total_count,
    strict,
    rejected: candidates.length - result.length,
  });
}
