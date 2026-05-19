// ============================================================
// POST /api/proposition
// Body : { prospect_id, kwc, production_kwh, score, toiture, ... }
//   → calcule financier, génère HTML, met à jour le prospect
//     (proposition_id, proposition_html, statut)
//   → renvoie { proposition_id, url, html }
// ============================================================

import { NextResponse } from 'next/server';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoProspects } from '@/lib/demo-data';
import { calculerFinancier } from '@/lib/financial';
import { genererPropositionHTML } from '@/lib/proposition';
import type { Prospect, PropositionData } from '@/types';

export const dynamic = 'force-dynamic';

interface PropositionRequest {
  prospect_id: string;
  kwc: number;
  production_kwh: number;
  toiture: {
    surface_m2: number;
    nb_panneaux: number;
    orientation: string;
    heures_ensoleillement: number;
    score_solaire: number;
    qualite_imagerie: string;
  };
}

function genNumero(): string {
  const d = new Date();
  return `EC-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function genId(): string {
  return `prop_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as PropositionRequest;
  const { prospect_id, kwc, production_kwh, toiture } = body;

  if (!prospect_id || !kwc || !production_kwh) {
    return NextResponse.json(
      { error: 'Champs manquants: prospect_id, kwc, production_kwh' },
      { status: 400 },
    );
  }

  const financier = calculerFinancier(kwc, production_kwh);
  const numero = genNumero();
  const proposition_id = genId();
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Récupération prospect
  let prospect: Prospect | null = null;

  if (supabaseEnabled) {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('prospects')
        .select('*')
        .eq('id', prospect_id)
        .maybeSingle();
      prospect = data as Prospect | null;
    }
  } else {
    prospect = demoProspects.find((p) => p.id === prospect_id) ?? null;
  }

  if (!prospect) {
    return NextResponse.json(
      { error: 'Prospect introuvable' },
      { status: 404 },
    );
  }

  const data: PropositionData = {
    prospect,
    numero,
    date,
    toiture,
    financier,
  };
  const html = genererPropositionHTML(data);

  // Mise à jour prospect
  const update: Partial<Prospect> = {
    puissance_kwc: kwc,
    nb_panneaux_recommande: financier.nb_panneaux,
    production_annuelle_kwh: production_kwh,
    surface_toit_m2: toiture.surface_m2,
    heures_ensoleillement: toiture.heures_ensoleillement,
    orientation_principale: toiture.orientation,
    score_solaire: toiture.score_solaire,
    qualite_imagerie: toiture.qualite_imagerie,
    cout_installation_ttc: financier.cout_installation_ttc,
    aides_totales: financier.aides_totales,
    reste_a_charge: financier.reste_a_charge,
    economie_annuelle: financier.economie_annuelle,
    temps_retour_ans: financier.temps_retour_ans,
    co2_evite_kg_an: financier.co2_evite_kg_an,
    statut: 'proposition_envoyee',
    proposition_id,
    proposition_html: html,
  };

  if (supabaseEnabled) {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('prospects').update(update).eq('id', prospect_id);
    }
  } else {
    const idx = demoProspects.findIndex((p) => p.id === prospect_id);
    if (idx >= 0 && demoProspects[idx]) {
      Object.assign(demoProspects[idx]!, update, {
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    proposition_id,
    numero,
    url: `/proposition/${proposition_id}`,
    html,
    financier,
  });
}
