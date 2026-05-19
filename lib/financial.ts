// ============================================================
// Énergies Concept — Calculs financiers France 2026
// ============================================================
//
// Source des tarifs : arrêté tarifaire S1 2026 (CRE), barème TVA
// installations photovoltaïques < 9 kWc et > 9 kWc.

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

// Coût installation HT par kWc (€/kWc, marché français 2026)
const COUT_PAR_KWC_HT: Record<'petit' | 'grand', number> = {
  petit: 2200,   // ≤ 3 kWc
  grand: 2000,   // > 3 kWc, dégressif via barème
};

// Puissance unitaire panneau (Wc)
const PUISSANCE_PANNEAU_WC = 425;

// Surface unitaire panneau (m²)
const SURFACE_PANNEAU_M2 = 1.95;

// ============================================================
// Recommandation puissance
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

  let kwc = Math.min(kwc_cible, kwc_max);
  // Arrondi au 0.5
  kwc = Math.round(kwc * 2) / 2;
  if (kwc < 1.5) kwc = 1.5;

  const nb_panneaux = Math.round((kwc * 1000) / PUISSANCE_PANNEAU_WC);
  return { kwc, nb_panneaux };
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

function coutInstallationHT(kwc: number): number {
  const tarif = kwc <= 3 ? COUT_PAR_KWC_HT.petit : COUT_PAR_KWC_HT.grand;
  return Math.round(kwc * tarif);
}

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
  kwc: number,
  productionKwh: number,
): FinancialAnalysis {
  // Coûts
  const cout_installation_ht = coutInstallationHT(kwc);
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

  // Projection 25 ans (avec dégradation + hausse tarifs + prime 5 ans)
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
    nb_panneaux: Math.round((kwc * 1000) / PUISSANCE_PANNEAU_WC),
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
