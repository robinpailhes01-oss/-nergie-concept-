// ============================================================
// Référentiels INSEE — labels lisibles pour les codes
// ============================================================

export const EFFECTIF_LABELS: Record<string, string> = {
  NN: 'Non renseigné',
  '00': '0 salarié',
  '01': '1 ou 2 sal.',
  '02': '3 à 5 sal.',
  '03': '6 à 9 sal.',
  '11': '10 à 19 sal.',
  '12': '20 à 49 sal.',
  '21': '50 à 99 sal.',
  '22': '100 à 199 sal.',
  '31': '200 à 249 sal.',
  '32': '250 à 499 sal.',
  '41': '500 à 999 sal.',
  '42': '1000 à 1999 sal.',
  '51': '2000 à 4999 sal.',
  '52': '5000 à 9999 sal.',
  '53': '10 000+ sal.',
};

export const SECTION_LABELS: Record<string, string> = {
  A: 'Agriculture',
  B: 'Industries extractives',
  C: 'Industrie',
  F: 'Construction',
  G: 'Commerce',
  H: 'Transports / logistique',
  I: 'Hôtellerie-restauration',
  J: 'Information & communication',
  K: 'Finance & assurance',
  L: 'Immobilier',
  M: 'Services spécialisés',
  N: 'Services administratifs',
  P: 'Enseignement',
  Q: 'Santé',
  R: 'Arts & loisirs',
  S: 'Autres services',
};

// Sections prioritaires pour le solaire (gros toits typiquement)
export const SECTIONS_SOLAR_PRIORITAIRES: Array<{
  code: string;
  label: string;
  emoji: string;
}> = [
  { code: 'C', label: 'Industrie', emoji: '🏭' },
  { code: 'G', label: 'Commerce', emoji: '🛒' },
  { code: 'H', label: 'Logistique', emoji: '📦' },
  { code: 'I', label: 'Hôtels & restauration', emoji: '🏨' },
  { code: 'F', label: 'Construction', emoji: '🔨' },
  { code: 'Q', label: 'Santé', emoji: '🏥' },
  { code: 'P', label: 'Enseignement', emoji: '📚' },
];

export const CATEGORIES = [
  { code: 'PME', label: 'PME (10-249 sal.)' },
  { code: 'ETI', label: 'ETI (250-4999 sal.)' },
  { code: 'GE', label: 'Grandes (5000+ sal.)' },
];

// ============================================================
// Normalisation / matching de noms (registre ODRÉ ↔ SIRENE)
// ============================================================

// Formes juridiques et mots génériques à ignorer dans les comparaisons
const MOTS_VIDES = new Set([
  'SARL', 'SAS', 'SASU', 'SCI', 'SCEA', 'EARL', 'EURL', 'SA', 'SNC',
  'STE', 'SOCIETE', 'ETS', 'ETABLISSEMENTS', 'GROUPE', 'HOLDING',
  'TOITURE', 'TOITURES', 'PV', 'SOLAIRE', 'PHOTOVOLTAIQUE', 'CENTRALE',
  'PARC', 'BAT', 'BATIMENT', 'NORD', 'SUD', 'EST', 'OUEST', 'REC',
  'HTA', 'BT', 'FILS', 'ET', 'DE', 'DU', 'DES', 'LA', 'LE', 'LES',
]);

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function tokensSignificatifs(nom: string): string[] {
  return sansAccents(nom.toUpperCase())
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 3 && !MOTS_VIDES.has(t) && !/^\d+$/.test(t));
}

// Nettoie un nom d'installation ODRÉ pour requêter SIRENE
// ("AFRD88_6542_SCI BENANGE_REC_1" → "BENANGE")
export function nettoyerNomInstallation(nom: string): string {
  return tokensSignificatifs(nom).slice(0, 3).join(' ');
}

// Match conservateur : un token significatif de ≥ 5 caractères en
// commun, ou tous les tokens de l'un contenus dans l'autre.
export function nomsCorrespondent(a: string, b: string): boolean {
  const ta = tokensSignificatifs(a);
  const tb = tokensSignificatifs(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const setB = new Set(tb);
  const communs = ta.filter((t) => setB.has(t));
  if (communs.some((t) => t.length >= 5)) return true;
  return communs.length >= 2;
}
