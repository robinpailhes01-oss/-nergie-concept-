// ============================================================
// /api/prospects
//   GET    → liste (filtres : statut, q, ville)
//   POST   → créer
// /api/prospects/[id]
//   PATCH  → mise à jour partielle
// ============================================================

import { NextResponse } from 'next/server';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoProspects } from '@/lib/demo-data';
import type { Prospect, ProspectInsert } from '@/types';

export const dynamic = 'force-dynamic';

function filterDemo(
  prospects: Prospect[],
  filters: { statut?: string; q?: string; ville?: string },
): Prospect[] {
  return prospects.filter((p) => {
    if (filters.statut && p.statut !== filters.statut) return false;
    if (filters.ville && p.ville !== filters.ville) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = `${p.nom} ${p.prenom} ${p.email ?? ''} ${p.adresse} ${p.ville}`
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get('statut') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const ville = searchParams.get('ville') ?? undefined;

  if (!supabaseEnabled) {
    return NextResponse.json({
      prospects: filterDemo(demoProspects, { statut, q, ville }),
      demo: true,
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ prospects: demoProspects, demo: true });
  }

  let query = supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false });

  if (statut) query = query.eq('statut', statut);
  if (ville) query = query.eq('ville', ville);
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      `nom.ilike.${like},prenom.ilike.${like},email.ilike.${like},adresse.ilike.${like},ville.ilike.${like}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({
      prospects: filterDemo(demoProspects, { statut, q, ville }),
      demo: true,
      error: error.message,
    });
  }

  return NextResponse.json({
    prospects: (data ?? []) as Prospect[],
    demo: false,
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as ProspectInsert;

  if (!body.nom || !body.prenom || !body.adresse || !body.ville) {
    return NextResponse.json(
      { error: 'Champs obligatoires : nom, prenom, adresse, ville' },
      { status: 400 },
    );
  }

  if (!supabaseEnabled) {
    const fake: Prospect = {
      id: `demo-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      statut: body.statut ?? 'nouveau',
      email: body.email ?? null,
      telephone: body.telephone ?? null,
      code_postal: body.code_postal ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      surface_toit_m2: body.surface_toit_m2 ?? null,
      nb_panneaux_recommande: body.nb_panneaux_recommande ?? null,
      production_annuelle_kwh: body.production_annuelle_kwh ?? null,
      heures_ensoleillement: body.heures_ensoleillement ?? null,
      orientation_principale: body.orientation_principale ?? null,
      score_solaire: body.score_solaire ?? null,
      qualite_imagerie: body.qualite_imagerie ?? null,
      puissance_kwc: body.puissance_kwc ?? null,
      cout_installation_ttc: body.cout_installation_ttc ?? null,
      aides_totales: body.aides_totales ?? null,
      reste_a_charge: body.reste_a_charge ?? null,
      economie_annuelle: body.economie_annuelle ?? null,
      temps_retour_ans: body.temps_retour_ans ?? null,
      co2_evite_kg_an: body.co2_evite_kg_an ?? null,
      panneaux_detectes: body.panneaux_detectes ?? null,
      date_photo_satellite: body.date_photo_satellite ?? null,
      notes: body.notes ?? null,
      proposition_id: body.proposition_id ?? null,
      proposition_html: body.proposition_html ?? null,
      proposition_vue_at: body.proposition_vue_at ?? null,
      nom: body.nom,
      prenom: body.prenom,
      adresse: body.adresse,
      ville: body.ville,
    };
    return NextResponse.json({ prospect: fake, demo: true });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase indisponible' },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('prospects')
    .insert(body)
    .select()
    .single();

  if (error) {
    // Supabase configuré mais table absente (ex: projet non migré) → mode démo
    const fake: Prospect = {
      id: `demo-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      statut: body.statut ?? 'nouveau',
      email: body.email ?? null,
      telephone: body.telephone ?? null,
      code_postal: body.code_postal ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      surface_toit_m2: body.surface_toit_m2 ?? null,
      nb_panneaux_recommande: body.nb_panneaux_recommande ?? null,
      production_annuelle_kwh: body.production_annuelle_kwh ?? null,
      heures_ensoleillement: body.heures_ensoleillement ?? null,
      orientation_principale: body.orientation_principale ?? null,
      score_solaire: body.score_solaire ?? null,
      qualite_imagerie: body.qualite_imagerie ?? null,
      puissance_kwc: body.puissance_kwc ?? null,
      cout_installation_ttc: body.cout_installation_ttc ?? null,
      aides_totales: body.aides_totales ?? null,
      reste_a_charge: body.reste_a_charge ?? null,
      economie_annuelle: body.economie_annuelle ?? null,
      temps_retour_ans: body.temps_retour_ans ?? null,
      co2_evite_kg_an: body.co2_evite_kg_an ?? null,
      panneaux_detectes: body.panneaux_detectes ?? null,
      date_photo_satellite: body.date_photo_satellite ?? null,
      notes: body.notes ?? null,
      proposition_id: body.proposition_id ?? null,
      proposition_html: body.proposition_html ?? null,
      proposition_vue_at: body.proposition_vue_at ?? null,
      nom: body.nom,
      prenom: body.prenom,
      adresse: body.adresse,
      ville: body.ville,
    };
    return NextResponse.json({ prospect: fake, demo: true });
  }

  return NextResponse.json({ prospect: data as Prospect, demo: false });
}
