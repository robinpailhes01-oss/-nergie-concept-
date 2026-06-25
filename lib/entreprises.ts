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

// ============================================================
// Fiabilité adresse : NAF "propriétaire-occupant"
// ============================================================
//
// Pour les installations solaires existantes, on veut savoir si
// l'adresse SIRENE de l'entreprise = adresse réelle des panneaux.
//
// Vrai dans 95%+ des cas pour :
//   - Industrie (10–33)            → usines avec leurs toits
//   - Construction (41–43)         → ateliers
//   - Commerce (45–47)             → magasins, supermarchés
//   - Transport / logistique (49–53) → entrepôts
//   - Hôtellerie-restauration (55–56)
//   - Enseignement (85)            → écoles, collèges
//   - Santé (86–88)                → cliniques, EHPAD
//   - Administration publique (84) → mairies, gendarmeries
//   - Agriculture (01–03)          → exploitations
//   - Sports & loisirs (93)        → gymnases
//
// FAUX (panneaux ailleurs) pour :
//   - Activités financières (64)         → holdings, SPV
//   - Assurance (65), fonds (66)
//   - Immobilier (68)                    → SCI, foncières
//   - Sièges sociaux (70)                → holdings
const NAF_RACINES_FIABLES: readonly string[] = [
  '01', '02', '03',                                     // agriculture
  '10', '11', '12', '13', '14', '15', '16', '17', '18', // industrie
  '19', '20', '21', '22', '23', '24', '25', '26', '27',
  '28', '29', '30', '31', '32', '33',
  '35', '36', '37', '38', '39',                         // énergie, eau, déchets
  '41', '42', '43',                                     // construction
  '45', '46', '47',                                     // commerce
  '49', '50', '51', '52', '53',                         // transport/logistique
  '55', '56',                                           // hôtels / restauration
  '58', '59', '60', '61', '62', '63',                   // info & comm
  '71', '72', '73', '74', '75',                         // services tech
  '77', '78', '79', '80', '81', '82',                   // services support
  '84',                                                  // admin publique
  '85',                                                  // enseignement
  '86', '87', '88',                                     // santé / social
  '90', '91', '92', '93', '94', '95', '96',             // culture, sports, loisirs
];

// NAF où l'entreprise détient des actifs scattered (panneaux ailleurs)
const NAF_RACINES_NON_FIABLES: readonly string[] = [
  '64', // activités des services financiers
  '65', // assurance
  '66', // activités auxiliaires de finance
  '68', // immobilier (SCI, foncières)
  '70', // sièges sociaux, conseil de gestion
];

export function nafEstFiable(naf: string | null | undefined): boolean {
  if (!naf) return false;
  const racine = naf.replace(/\./g, '').substring(0, 2);
  if (NAF_RACINES_NON_FIABLES.includes(racine)) return false;
  return NAF_RACINES_FIABLES.includes(racine);
}

// Patterns dans le nom d'installation qui signalent un PROJET
// (≠ un bâtiment occupé) → l'adresse n'est probablement pas celle des panneaux
const PATTERNS_PROJET = [
  /\bPARC\b/i,
  /\bCENTRALE\b/i,
  /\bFERME\b/i,
  /\bSPV\b/i,
  /\bSCI\b/i,
  /\bAFRD?\d+/i, // code projet anonyme ENEDIS
];

export function nomEstProjet(nomInstallation: string): boolean {
  return PATTERNS_PROJET.some((p) => p.test(nomInstallation));
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
