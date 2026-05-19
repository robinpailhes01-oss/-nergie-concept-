import { Users, FileText, Send, Euro } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ProspectsChart } from '@/components/dashboard/ProspectsChart';
import { ConversionChart } from '@/components/dashboard/ConversionChart';
import { RecentProspects } from '@/components/dashboard/RecentProspects';
import { AnalyseWidget } from '@/components/dashboard/AnalyseWidget';
import { formatEuros } from '@/lib/financial';
import { demoProspects, demoStats } from '@/lib/demo-data';
import { supabaseEnabled, getSupabase } from '@/lib/supabase';
import type { DashboardStats, Prospect } from '@/types';

export const dynamic = 'force-dynamic';

async function loadData(): Promise<{
  stats: DashboardStats;
  prospects: Prospect[];
  demo: boolean;
}> {
  if (!supabaseEnabled) {
    return { stats: demoStats(), prospects: demoProspects, demo: true };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { stats: demoStats(), prospects: demoProspects, demo: true };
  }

  const [{ data: statsRow }, { data: prospectsRows }] = await Promise.all([
    supabase.from('dashboard_stats').select('*').maybeSingle(),
    supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    stats: (statsRow as DashboardStats | null) ?? demoStats(),
    prospects: (prospectsRows as Prospect[] | null) ?? demoProspects,
    demo: false,
  };
}

export default async function DashboardPage() {
  const { stats, prospects, demo } = await loadData();

  return (
    <div className="max-w-7xl mx-auto stagger">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-text-muted mt-1">
            Vue d'ensemble de l'activité prospection solaire
          </p>
        </div>
        {demo && (
          <div
            className="text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-md font-semibold"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            Mode démo
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total prospects"
          value={String(stats.total_prospects)}
          trend="+12% ce mois"
          iconColor="orange"
        />
        <StatCard
          icon={FileText}
          label="Analyses réalisées"
          value={String(stats.total_analyses)}
          trend="+8% ce mois"
          iconColor="teal"
        />
        <StatCard
          icon={Send}
          label="Propositions envoyées"
          value={String(stats.total_propositions)}
          trend="+24% ce mois"
          iconColor="blue"
        />
        <StatCard
          icon={Euro}
          label="CA pipeline"
          value={formatEuros(Number(stats.ca_pipeline))}
          trend={`${stats.total_signes} signés · ${formatEuros(
            Number(stats.ca_signe),
          )}`}
          iconColor="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ProspectsChart />
        <ConversionChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentProspects prospects={prospects} />
        </div>
        <AnalyseWidget />
      </div>
    </div>
  );
}
