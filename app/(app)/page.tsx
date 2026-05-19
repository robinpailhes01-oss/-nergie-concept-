import { Users, FileText, Send, Euro } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ProspectsChart } from '@/components/dashboard/ProspectsChart';
import { ConversionChart } from '@/components/dashboard/ConversionChart';
import { RecentProspects } from '@/components/dashboard/RecentProspects';
import { AnalyseWidget } from '@/components/dashboard/AnalyseWidget';
import { formatEuros } from '@/lib/financial';
import { demoProspects, demoStats } from '@/lib/demo-data';
import { supabaseEnabled, getSupabase } from '@/lib/supabase';
import {
  buildMonthly,
  buildWeeklyConversion,
  conversionMoyenne,
} from '@/lib/chart-data';
import type { DashboardStats, Prospect } from '@/types';

export const dynamic = 'force-dynamic';

async function loadData(): Promise<{
  stats: DashboardStats;
  prospects: Prospect[];
  allProspects: Prospect[];
  demo: boolean;
}> {
  if (!supabaseEnabled) {
    return {
      stats: demoStats(),
      prospects: demoProspects.slice(0, 10),
      allProspects: demoProspects,
      demo: true,
    };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return {
      stats: demoStats(),
      prospects: demoProspects.slice(0, 10),
      allProspects: demoProspects,
      demo: true,
    };
  }

  const [{ data: statsRow }, { data: allRows }] = await Promise.all([
    supabase.from('dashboard_stats').select('*').maybeSingle(),
    supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const allProspects = (allRows as Prospect[] | null) ?? demoProspects;

  return {
    stats: (statsRow as DashboardStats | null) ?? demoStats(),
    prospects: allProspects.slice(0, 10),
    allProspects,
    demo: false,
  };
}

export default async function DashboardPage() {
  const { stats, prospects, allProspects, demo } = await loadData();
  const monthly = buildMonthly(allProspects, 7);
  const weekly = buildWeeklyConversion(allProspects, 8);
  const moyenne = conversionMoyenne(weekly);

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
        <ProspectsChart data={monthly} />
        <ConversionChart data={weekly} moyenne={moyenne} />
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
