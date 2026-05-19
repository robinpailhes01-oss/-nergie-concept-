import { notFound } from 'next/navigation';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoProspects } from '@/lib/demo-data';
import { calculerFinancier } from '@/lib/financial';
import { genererPropositionHTML } from '@/lib/proposition';
import { isUuid } from '@/lib/uuid';
import { PropositionViewer } from './PropositionViewer';
import type { Prospect, PropositionData } from '@/types';

export const dynamic = 'force-dynamic';

async function loadProspect(id: string): Promise<Prospect | null> {
  if (!supabaseEnabled) {
    return (
      demoProspects.find(
        (p) => p.id === id || p.proposition_id === id,
      ) ?? null
    );
  }
  const supabase = getSupabase();
  if (!supabase) return null;

  const query = supabase.from('prospects').select('*');
  const { data } = isUuid(id)
    ? await query
        .or(`id.eq.${id},proposition_id.eq.${id}`)
        .maybeSingle()
    : await query.eq('proposition_id', id).maybeSingle();
  return (data as Prospect | null) ?? null;
}

function buildHTML(prospect: Prospect): string {
  if (prospect.proposition_html) return prospect.proposition_html;

  // Pas d'HTML stocké → on régénère à la volée
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
  };
  return genererPropositionHTML(data);
}

export default async function PropositionPage({
  params,
}: {
  params: { id: string };
}) {
  const prospect = await loadProspect(params.id);
  if (!prospect) notFound();

  const html = buildHTML(prospect);

  return (
    <PropositionViewer
      html={html}
      prospectId={prospect.id}
      prenom={prospect.prenom}
      nom={prospect.nom}
      propositionId={prospect.proposition_id ?? params.id}
    />
  );
}
