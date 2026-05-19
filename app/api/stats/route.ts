// ============================================================
// GET /api/stats — KPIs du dashboard
// ============================================================

import { NextResponse } from 'next/server';
import { getSupabase, supabaseEnabled } from '@/lib/supabase';
import { demoStats } from '@/lib/demo-data';
import type { DashboardStats } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseEnabled) {
    return NextResponse.json({ stats: demoStats(), demo: true });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ stats: demoStats(), demo: true });
  }

  const { data, error } = await supabase
    .from('dashboard_stats')
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ stats: demoStats(), demo: true });
  }

  return NextResponse.json({ stats: data as DashboardStats, demo: false });
}
