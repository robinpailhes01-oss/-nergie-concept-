import { Users, FileText, Send, Euro, Wrench, Zap, ArrowRight, Building2 } from 'lucide-react';
import Link from 'next/link';
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

interface CrmCounts {
  equipe: number;
  toiture: number;
  b2b: number;
  particulier: number;
}

function computeCrmCounts(prospects: Prospect[]): CrmCounts {
  let equipe = 0, toiture = 0, b2b = 0, particulier = 0;
  for (const p of prospects) {
    const prenom = p.prenom ?? '';
    if (prenom === '(B2B équipé)' || p.notes?.includes('Lead MAINTENANCE')) equipe++;
    else if (prenom === '(B2B sans panneaux)' || p.notes?.includes('NOUVELLE INSTALLATION')) toiture++;
    else if (prenom === '(B2B)') b2b++;
    else particulier++;
  }
  return { equipe, toiture, b2b, particulier };
}

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
  const crm = computeCrmCounts(allProspects);
  const total = stats.total_prospects;

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

      {/* CRM — Répartition des leads */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">CRM — Leads solaires</h2>
            <p className="text-sm text-text-muted mt-0.5">
              Répartition de tes {total} prospect{total > 1 ? 's' : ''} par catégorie
            </p>
          </div>
          <Link
            href="/prospects"
            className="text-sm font-semibold flex items-center gap-1"
            style={{ color: '#F5821F' }}
          >
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Déjà équipés */}
          <div
            className="card sm:col-span-1 lg:col-span-2"
            style={{ borderLeft: '4px solid #0D7C66' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #CCFBF1, #99F6E4)' }}
                  >
                    <Wrench className="w-4 h-4" style={{ color: '#0D7C66' }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#0D7C66' }}>
                    Déjà équipés
                  </span>
                </div>
                <div className="font-display text-4xl font-bold">{crm.equipe}</div>
                <div className="text-sm text-text-muted mt-1">
                  Maintenance · Extension · Batterie
                </div>
              </div>
              <Link
                href="/prospection"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: '#CCFBF1', color: '#065F46' }}
              >
                Scanner →
              </Link>
            </div>
            {total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>{Math.round((crm.equipe / total) * 100)}% du pipeline</span>
                  <span>{crm.equipe} prospect{crm.equipe > 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round((crm.equipe / total) * 100)}%`,
                      background: 'linear-gradient(90deg, #0D7C66, #10B981)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* À installer */}
          <div
            className="card sm:col-span-1 lg:col-span-2"
            style={{ borderLeft: '4px solid #2563EB' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' }}
                  >
                    <Zap className="w-4 h-4" style={{ color: '#2563EB' }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#2563EB' }}>
                    À installer
                  </span>
                </div>
                <div className="font-display text-4xl font-bold">{crm.toiture}</div>
                <div className="text-sm text-text-muted mt-1">
                  Nouvelle installation · Rooftop ≥ 90 m²
                </div>
              </div>
              <Link
                href="/prospection"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: '#DBEAFE', color: '#1D4ED8' }}
              >
                Scanner →
              </Link>
            </div>
            {total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>{Math.round((crm.toiture / total) * 100)}% du pipeline</span>
                  <span>{crm.toiture} prospect{crm.toiture > 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round((crm.toiture / total) * 100)}%`,
                      background: 'linear-gradient(90deg, #2563EB, #60A5FA)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* B2B + Particuliers — petites cartes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card py-3 px-4 flex items-center gap-3" style={{ borderLeft: '3px solid #D97706' }}>
            <Building2 className="w-4 h-4 shrink-0" style={{ color: '#D97706' }} />
            <div>
              <div className="font-display text-2xl font-bold">{crm.b2b}</div>
              <div className="text-xs text-text-muted">B2B général</div>
            </div>
          </div>
          <div className="card py-3 px-4 flex items-center gap-3" style={{ borderLeft: '3px solid #6B7280' }}>
            <Users className="w-4 h-4 shrink-0 text-text-muted" />
            <div>
              <div className="font-display text-2xl font-bold">{crm.particulier}</div>
              <div className="text-xs text-text-muted">Particuliers</div>
            </div>
          </div>
          <div className="card py-3 px-4 flex items-center gap-3 col-span-2" style={{ borderLeft: '3px solid #F5821F' }}>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text-muted mb-1.5">Distribution globale</div>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                {total > 0 && crm.equipe > 0 && (
                  <div style={{ width: `${(crm.equipe / total) * 100}%`, background: '#0D7C66' }} className="rounded-full" />
                )}
                {total > 0 && crm.toiture > 0 && (
                  <div style={{ width: `${(crm.toiture / total) * 100}%`, background: '#2563EB' }} className="rounded-full" />
                )}
                {total > 0 && crm.b2b > 0 && (
                  <div style={{ width: `${(crm.b2b / total) * 100}%`, background: '#D97706' }} className="rounded-full" />
                )}
                {total > 0 && crm.particulier > 0 && (
                  <div style={{ width: `${(crm.particulier / total) * 100}%`, background: '#9CA3AF' }} className="rounded-full" />
                )}
                {total === 0 && (
                  <div style={{ width: '100%', background: '#E5E7EB' }} className="rounded-full" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#0D7C66' }} />Équipés</span>
                <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2563EB' }} />Installer</span>
                <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#D97706' }} />B2B</span>
                <span className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#9CA3AF' }} />Partic.</span>
              </div>
            </div>
          </div>
        </div>
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
