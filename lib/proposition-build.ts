// ============================================================
// Construction de l'HTML de proposition à partir d'un Prospect.
// Fonction pure (utilisable serveur ET navigateur) — sert au
// rendu serveur normal et au fallback démo (localStorage).
// ============================================================

import { calculerFinancier } from './financial';
import { genererPropositionHTML } from './proposition';
import { getStaticSatelliteUrl } from './satellite';
import type { Prospect, PropositionData } from '@/types';

export function buildPropositionHTML(prospect: Prospect): string {
  if (prospect.proposition_html) return prospect.proposition_html;

  const kwc = prospect.puissance_kwc ?? 4.5;
  const prod = prospect.production_annuelle_kwh ?? 4500;
  const fin = calculerFinancier(kwc, prod);
  const data: PropositionData = {
    prospect,
    numero: prospect.proposition_id ?? 'EC-DEMO',
    date: new Date(prospect.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    toiture: {
      surface_m2: prospect.surface_toit_m2 ?? 70,
      nb_panneaux: prospect.nb_panneaux_recommande ?? fin.nb_panneaux,
      orientation: prospect.orientation_principale ?? 'Sud',
      heures_ensoleillement: prospect.heures_ensoleillement ?? 2500,
      score_solaire: prospect.score_solaire ?? 80,
      qualite_imagerie: prospect.qualite_imagerie ?? 'HIGH',
    },
    financier: fin,
    photo_satellite_url: getStaticSatelliteUrl(
      prospect.latitude,
      prospect.longitude,
      { width: 640, height: 360, zoom: 20 },
    ),
  };
  return genererPropositionHTML(data);
}
