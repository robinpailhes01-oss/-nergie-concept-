// ============================================================
// /api/prospects/[id]
//   GET   → un prospect
//   PATCH → mise à jour partielle (notes, statut, etc.)
// ============================================================

import { NextResponse } from 'next/server';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoProspects } from '@/lib/demo-data';
import type { Prospect } from '@/types';

export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  if (!supabaseEnabled) {
    const p = demoProspects.find(
      (x) => x.id === params.id || x.proposition_id === params.id,
    );
    if (!p) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ prospect: p, demo: true });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase indisponible' }, { status: 500 });
  }

  // On accepte id ou proposition_id
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .or(`id.eq.${params.id},proposition_id.eq.${params.id}`)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  return NextResponse.json({ prospect: data as Prospect, demo: false });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const body = (await req.json()) as Partial<Prospect>;

  if (!supabaseEnabled) {
    const p = demoProspects.find((x) => x.id === params.id);
    if (!p) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    Object.assign(p, body, { updated_at: new Date().toISOString() });
    return NextResponse.json({ prospect: p, demo: true });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase indisponible' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('prospects')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospect: data as Prospect, demo: false });
}
