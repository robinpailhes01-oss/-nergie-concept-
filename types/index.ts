// ============================================================
// Énergies Concept — Types globaux
// ============================================================

export type ProspectStatut =
  | 'nouveau'
  | 'proposition_envoyee'
  | 'visite_planifiee'
  | 'signe'
  | 'perdu';

export type QualiteImagerie = 'HIGH' | 'MEDIUM' | 'LOW';

// Détection de panneaux solaires existants sur le toit (Google DETECTED_ARRAYS)
//   oui     = panneaux confirmés sur l'imagerie satellite
//   non     = aucun panneau détecté
//   inconnu = donnée indisponible pour ce bâtiment
export type DetectionPanneaux = 'oui' | 'non' | 'inconnu';

export type Orientation =
  | 'Nord'
  | 'Nord-Est'
  | 'Est'
  | 'Sud-Est'
  | 'Sud'
  | 'Sud-Ouest'
  | 'Ouest'
  | 'Nord-Ouest';

// ============================================================
// Solar API — réponse normalisée
// ============================================================

export interface GeocodeResult {
  adresse: string;
  ville: string;
  code_postal: string;
  latitude: number;
  longitude: number;
}

export interface ToitureData {
  surface_m2: number;
  nb_panneaux_max: number;
  orientation_principale: Orientation;
  inclinaison_deg: number;
  heures_ensoleillement: number;
  qualite_imagerie: QualiteImagerie;
}

export interface ProductionScenario {
  kwc: number;
  nb_panneaux: number;
  production_annuelle_kwh: number;
}

export interface SolarApiResponse {
  demo: boolean;
  geocode: GeocodeResult;
  toiture: ToitureData;
  production: ProductionScenario;
  scenarios: ProductionScenario[];
  qualite: QualiteImagerie;
  score_solaire: number;
  photo_satellite_url: string | null;
  imagery_date: string | null;
  // Détection IA des panneaux existants (Google DETECTED_ARRAYS)
  panneaux_detectes: DetectionPanneaux;
  detection_date: string | null;
}

// ============================================================
// Financier
// ============================================================

export interface YearlyProjection {
  annee: number;
  production_kwh: number;
  economie: number;
  economie_cumulee: number;
}

export interface FinancialAnalysis {
  kwc: number;
  nb_panneaux: number;
  production_annuelle_kwh: number;

  // Coûts
  cout_installation_ht: number;
  cout_installation_ttc: number;
  taux_tva: number;

  // Aides
  prime_autoconsommation_total: number;
  aides_totales: number;
  reste_a_charge: number;

  // Économies annuelles
  autoconsommation_kwh: number;
  surplus_kwh: number;
  economie_autoconsommation: number;
  revenu_revente: number;
  economie_annuelle: number;

  // ROI
  temps_retour_ans: number;
  gain_25_ans: number;

  // Environnement
  co2_evite_kg_an: number;
  arbres_equivalent: number;

  // Projection détaillée
  projection: YearlyProjection[];
}

// ============================================================
// Prospect (mappe la table Supabase)
// ============================================================

export interface Prospect {
  id: string;
  created_at: string;
  updated_at: string;

  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;

  adresse: string;
  ville: string;
  code_postal: string | null;
  latitude: number | null;
  longitude: number | null;

  surface_toit_m2: number | null;
  nb_panneaux_recommande: number | null;
  production_annuelle_kwh: number | null;
  heures_ensoleillement: number | null;
  orientation_principale: string | null;
  score_solaire: number | null;
  qualite_imagerie: string | null;

  puissance_kwc: number | null;
  cout_installation_ttc: number | null;
  aides_totales: number | null;
  reste_a_charge: number | null;
  economie_annuelle: number | null;
  temps_retour_ans: number | null;
  co2_evite_kg_an: number | null;

  // Détection panneaux existants + date de la photo satellite (Google Solar)
  panneaux_detectes?: DetectionPanneaux | null;
  date_photo_satellite?: string | null;

  statut: ProspectStatut;
  notes: string | null;
  proposition_id: string | null;
  proposition_html: string | null;
  proposition_vue_at: string | null;
}

export type ProspectInsert = Omit<
  Prospect,
  'id' | 'created_at' | 'updated_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ============================================================
// Dashboard stats (vue Supabase)
// ============================================================

export interface DashboardStats {
  total_prospects: number;
  total_analyses: number;
  total_propositions: number;
  total_signes: number;
  ca_pipeline: number;
  ca_signe: number;
  roi_moyen_ans: number;
}

// ============================================================
// Données proposition (pour le générateur HTML)
// ============================================================

export interface PropositionData {
  prospect: Prospect;
  numero: string;
  date: string;
  toiture: {
    surface_m2: number;
    nb_panneaux: number;
    orientation: string;
    heures_ensoleillement: number;
    score_solaire: number;
    qualite_imagerie: string;
  };
  financier: FinancialAnalysis;
  photo_satellite_url: string | null;
}
