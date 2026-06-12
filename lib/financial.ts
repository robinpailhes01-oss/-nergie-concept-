// ============================================================
// Énergies Concept — Calculs financiers France 2026
// ============================================================
//
// Source des tarifs réglementaires : arrêté tarifaire S1 2026 (CRE).
// Source de la grille de prix produit : Énergies Concept (interne).

import type {
  FinancialAnalysis,
  Orientation,
  YearlyProjection,
} from '@/types';

// --- Constantes réglementaires --------------------------------

export const PRIX_KWH_EDF = 0.2516;
export const RACHAT_SURPLUS_PETIT = 0.1362;   // ≤ 3 kWc
export const RACHAT_SURPLUS_GRAND = 0.1155;   // > 3 kWc
export const PRIME_AUTOCONSO_PETIT = 230;     // €/kWc/an, ≤ 3 kWc
export const PRIME_AUTOCONSO_ANNEES = 5;
export const TVA_PETIT = 0.10;                // ≤ 3 kWc
export const TVA_GRAND = 0.20;
export const DEGRADATION_PAR_AN = 0.005;
export const HAUSSE_TARIF_PAR_AN = 0.03;
export const CO2_FRANCE_KG_PAR_KWH = 0.0571;
export const CONSO_FOYER_MOYEN_KWH = 4500;

// Puissance unitaire panneau (Wc) — kits Énergies Concept
const PUISSANCE_PANNEAU_WC = 500;

// Surface unitaire panneau (m²) — module 500 Wc standard
const SURFACE_PANNEAU_M2 = 2.0;

// ============================================================
// Grille tarifaire officielle Énergies Concept
// Kit photovoltaïque + micro-onduleurs, prix HT.
// ============================================================

interface KitEC {
  kwc: number;
  nb_panneaux: number;
  ht: number;
}

export const GRILLE_PRIX_EC: ReadonlyArray<KitEC> = [
  { kwc: 2,  nb_panneaux: 4,  ht: 7181.82 },
  { kwc: 3,  nb_panneaux: 6,  ht: 9909.09 },
  { kwc: 4,  nb_panneaux: 8,  ht: 11166.67 },
  { kwc: 5,  nb_panneaux: 10, ht: 13666.67 },
  { kwc: 6,  nb_panneaux: 12, ht: 15750.00 },
  { kwc: 7,  nb_panneaux: 14, ht: 17416.67 },
  { kwc: 8,  nb_panneaux: 16, ht: 19916.67 },
  { kwc: 9,  nb_panneaux: 18, ht: 22416.67 },
  { kwc: 10, nb_panneaux: 20, ht: 24916.67 },
  { kwc: 11, nb_panneaux: 22, ht: 26583.33 },
  { kwc: 12, nb_panneaux: 24, ht: 28250.00 },
  { kwc: 13, nb_panneaux: 26, ht: 29916.67 },
  { kwc: 14, nb_panneaux: 28, ht: 31583.33 },
  { kwc: 15, nb_panneaux: 30, ht: 33250.00 },
];

const MIN_KWC = GRILLE_PRIX_EC[0]?.kwc ?? 2;
const MAX_KWC = GRILLE_PRIX_EC[GRILLE_PRIX_EC.length - 1]?.kwc ?? 15;

function snapToGrille(kwcWanted: number): KitEC {
  const clamped = Math.max(MIN_KWC, Math.min(MAX_KWC, Math.round(kwcWanted)));
  const found = GRILLE_PRIX_EC.find((g) => g.kwc === clamped);
  return found ?? GRILLE_PRIX_EC[0]!;
}

// ============================================================
// Recommandation puissance — snap aux puissances réellement
// commercialisées (entier kWc, bornes [2, 15])
// ============================================================

export function recommanderPuissance(
  surfaceM2: number,
  panneauxMax: number,
): { kwc: number; nb_panneaux: number } {
  const cible_kwh = CONSO_FOYER_MOYEN_KWH * 0.8;
  // ~1100 kWh/kWc/an en région méditerranéenne
  const kwc_cible = cible_kwh / 1100;

  // Limité par la surface
  const panneaux_par_surface = Math.floor(surfaceM2 / SURFACE_PANNEAU_M2);
  const panneaux_dispo = Math.min(panneauxMax, panneaux_par_surface);
  const kwc_max = (panneaux_dispo * PUISSANCE_PANNEAU_WC) / 1000;

  const kwc_brut = Math.min(kwc_cible, kwc_max);
  const offre = snapToGrille(kwc_brut);
  return { kwc: offre.kwc, nb_panneaux: offre.nb_panneaux };
}

// ============================================================
// Score solaire (0-100)
// ============================================================

const ORIENTATION_FACTEUR: Record<Orientation, number> = {
  'Sud': 1.0,
  'Sud-Est': 0.95,
  'Sud-Ouest': 0.95,
  'Est': 0.82,
  'Ouest': 0.82,
  'Nord-Est': 0.65,
  'Nord-Ouest': 0.65,
  'Nord': 0.50,
};

export function calculerScoreSolaire(
  heuresEnsoleillement: number,
  orientation: Orientation | string,
  surfaceM2: number,
  qualiteImagerie: 'HIGH' | 'MEDIUM' | 'LOW',
): number {
  const orientationKey = (orientation as Orientation) in ORIENTATION_FACTEUR
    ? (orientation as Orientation)
    : 'Sud';
  const orientationScore = ORIENTATION_FACTEUR[orientationKey] * 100;

  // Ensoleillement : 2800h = excellent (100), 1800h = moyen (60)
  const ensoleillementScore = Math.min(
    100,
    Math.max(0, ((heuresEnsoleillement - 1800) / 1000) * 100),
  );

  // Surface : 80m² ou + = top
  const surfaceScore = Math.min(100, (surfaceM2 / 80) * 100);

  // Qualité imagerie
  const qualiteScore =
    qualiteImagerie === 'HIGH' ? 100 : qualiteImagerie === 'MEDIUM' ? 75 : 50;

  // Pondération
  const score =
    orientationScore * 0.35 +
    ensoleillementScore * 0.30 +
    surfaceScore * 0.15 +
    qualiteScore * 0.20;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ============================================================
// Analyse financière complète
// ============================================================

function tauxTVA(kwc: number): number {
  return kwc <= 3 ? TVA_PETIT : TVA_GRAND;
}

function tarifRachatSurplus(kwc: number): number {
  return kwc <= 3 ? RACHAT_SURPLUS_PETIT : RACHAT_SURPLUS_GRAND;
}

function primeAutoconso(kwc: number): number {
  if (kwc > 3) return 0;
  return Math.round(kwc * PRIME_AUTOCONSO_PETIT * PRIME_AUTOCONSO_ANNEES);
}

export function calculerFinancier(
  kwcDemande: number,
  productionKwh: number,
): FinancialAnalysis {
  // Snap au kit Énergies Concept le plus proche
  const offre = snapToGrille(kwcDemande);
  const kwc = offre.kwc;

  // Coûts (issus de la grille tarifaire EC)
  const cout_installation_ht = Math.round(offre.ht);
  const taux_tva = tauxTVA(kwc);
  const cout_installation_ttc = Math.round(
    cout_installation_ht * (1 + taux_tva),
  );

  // Aides
  const prime_autoconsommation_total = primeAutoconso(kwc);
  const aides_totales = prime_autoconsommation_total;
  const reste_a_charge = cout_installation_ttc - aides_totales;

  // Répartition autoconso / surplus (taux d'autoconsommation 65%)
  const taux_autoconso = 0.65;
  const autoconsommation_kwh = Math.round(productionKwh * taux_autoconso);
  const surplus_kwh = Math.round(productionKwh - autoconsommation_kwh);

  // Économies année 1
  const economie_autoconsommation = autoconsommation_kwh * PRIX_KWH_EDF;
  const revenu_revente = surplus_kwh * tarifRachatSurplus(kwc);
  const economie_annuelle = Math.round(
    economie_autoconsommation + revenu_revente,
  );

  // Temps de retour
  const temps_retour_ans = +(reste_a_charge / economie_annuelle).toFixed(1);

  // Environnement
  const co2_evite_kg_an = Math.round(productionKwh * CO2_FRANCE_KG_PAR_KWH);
  const arbres_equivalent = Math.round(co2_evite_kg_an / 25);

  // Projection 25 ans (dégradation + hausse tarifs + prime 5 ans)
  const projection: YearlyProjection[] = [];
  let cumul = -reste_a_charge;
  for (let i = 1; i <= 25; i++) {
    const facteur_degradation = Math.pow(1 - DEGRADATION_PAR_AN, i - 1);
    const facteur_hausse = Math.pow(1 + HAUSSE_TARIF_PAR_AN, i - 1);
    const prod = productionKwh * facteur_degradation;
    const auto = prod * taux_autoconso * PRIX_KWH_EDF * facteur_hausse;
    const rev = prod * (1 - taux_autoconso) * tarifRachatSurplus(kwc);
    const prime_an =
      i <= PRIME_AUTOCONSO_ANNEES && kwc <= 3
        ? prime_autoconsommation_total / PRIME_AUTOCONSO_ANNEES
        : 0;
    const economie = auto + rev + prime_an;
    cumul += economie;
    projection.push({
      annee: i,
      production_kwh: Math.round(prod),
      economie: Math.round(economie),
      economie_cumulee: Math.round(cumul),
    });
  }

  const gain_25_ans = projection[projection.length - 1]?.economie_cumulee ?? 0;

  return {
    kwc,
    nb_panneaux: offre.nb_panneaux,
    production_annuelle_kwh: Math.round(productionKwh),
    cout_installation_ht,
    cout_installation_ttc,
    taux_tva,
    prime_autoconsommation_total,
    aides_totales,
    reste_a_charge,
    autoconsommation_kwh,
    surplus_kwh,
    economie_autoconsommation: Math.round(economie_autoconsommation),
    revenu_revente: Math.round(revenu_revente),
    economie_annuelle,
    temps_retour_ans,
    gain_25_ans,
    co2_evite_kg_an,
    arbres_equivalent,
    projection,
  };
}

// ============================================================
// Formatters
// ============================================================

export function formatEuros(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatKwh(n: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(n))} kWh`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}
