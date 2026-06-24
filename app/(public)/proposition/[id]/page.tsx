import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoProspects } from '@/lib/demo-data';
import { buildPropositionHTML } from '@/lib/proposition-build';
import { isUuid } from '@/lib/uuid';
import { PropositionViewer } from './PropositionViewer';
import { PropositionFallback } from './PropositionFallback';
import type { Prospect } from '@/types';

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

export default async function PropositionPage({
  params,
}: {
  params: { id: string };
}) {
  const prospect = await loadProspect(params.id);

  // Prospect non trouvé côté serveur : en démo, il a pu être créé
  // dans le navigateur (localStorage) → fallback client.
  if (!prospect) {
    return <PropositionFallback id={params.id} />;
  }

  return (
    <PropositionViewer
      html={buildPropositionHTML(prospect)}
      prospectId={prospect.id}
      prenom={prospect.prenom}
      nom={prospect.nom}
      propositionId={prospect.proposition_id ?? params.id}
    />
  );
}
