'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Save,
  Calendar,
  Sun,
  Zap,
  Euro,
  TrendingUp,
  Leaf,
  Compass,
  Clock,
  Send,
} from 'lucide-react';
import { StatutBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SatellitePhoto } from '@/components/ui/SatellitePhoto';
import { formatEuros, formatNumber } from '@/lib/financial';
import { getStaticSatelliteUrl } from '@/lib/satellite';
import type { Prospect, ProspectStatut } from '@/types';

const TABS: { key: ProspectStatut | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'nouveau', label: 'Nouveaux' },
  { key: 'proposition_envoyee', label: 'Propositions' },
  { key: 'visite_planifiee', label: 'Visites' },
  { key: 'signe', label: 'Signés' },
  { key: 'perdu', label: 'Perdus' },
];

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<ProspectStatut | 'all'>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Prospect | null>(null);

  async function reload() {
    setLoading(true);
    const r = await fetch('/api/prospects');
    const json = (await r.json()) as { prospects: Prospect[]; demo: boolean };
    setProspects(json.prospects);
    setDemo(json.demo);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return prospects.filter((p) => {
      if (activeTab !== 'all' && p.statut !== activeTab) return false;
      if (needle) {
        const hay = `${p.nom} ${p.prenom} ${p.email ?? ''} ${p.adresse} ${p.ville}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [prospects, activeTab, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: prospects.length };
    for (const p of prospects) c[p.statut] = (c[p.statut] ?? 0) + 1;
    return c;
  }, [prospects]);

  return (
    <div className="max-w-7xl mx-auto stagger">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Prospects</h1>
          <p className="text-text-muted mt-1">
            Pipeline commercial et suivi des opportunités
          </p>
        </div>
        {demo && (
          <div className="text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-md font-semibold"
            style={{ background: '#FEF3C7', color: '#92400E' }}>
            Mode démo
          </div>
        )}
      </header>

      <div className="card mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                style={{
                  background: activeTab === t.key ? '#FEF0E6' : 'transparent',
                  color: activeTab === t.key ? '#D96B0A' : '#6B7280',
                }}
              >
                {t.label}
                <span
                  className="text-[11px] px-1.5 rounded"
                  style={{
                    background:
                      activeTab === t.key ? '#fff' : 'rgba(0,0,0,0.05)',
                    color: activeTab === t.key ? '#D96B0A' : '#6B7280',
                  }}
                >
                  {counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom, ville, email…)"
              className="input pl-9"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                <th className="pb-3 pr-4">Prospect</th>
                <th className="pb-3 pr-4">Localisation</th>
                <th className="pb-3 pr-4">Installation</th>
                <th className="pb-3 pr-4">Montant</th>
                <th className="pb-3 pr-4">ROI</th>
                <th className="pb-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted">
                    Aucun prospect ne correspond aux critères.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="border-b border-border/60 last:border-0 hover:bg-background/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Thumbnail lat={p.latitude} lng={p.longitude} />
                      <div>
                        <div className="font-semibold">
                          {p.prenom} {p.nom}
                        </div>
                        <div className="text-xs text-text-muted">
                          {p.email ?? '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1 text-text-muted">
                      <MapPin className="w-3 h-3" />
                      {p.ville}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {p.puissance_kwc
                      ? `${p.puissance_kwc} kWc · ${p.nb_panneaux_recommande} pan.`
                      : '—'}
                  </td>
                  <td className="py-3 pr-4 font-semibold">
                    {p.cout_installation_ttc
                      ? formatEuros(p.cout_installation_ttc)
                      : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {p.temps_retour_ans ? `${p.temps_retour_ans} ans` : '—'}
                  </td>
                  <td className="py-3">
                    <StatutBadge statut={p.statut} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ProspectModal
        prospect={selected}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => {
          setProspects((all) =>
            all.map((p) => (p.id === updated.id ? updated : p)),
          );
          setSelected(updated);
        }}
      />
    </div>
  );
}

function Thumbnail({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const url = getStaticSatelliteUrl(lat, lng, {
    width: 96,
    height: 96,
    zoom: 19,
    marker: false,
  });
  if (!url) {
    return (
      <div
        className="w-12 h-12 rounded-lg shrink-0"
        style={{
          background:
            'linear-gradient(135deg, #FEF0E6 0%, #FCD7B4 100%)',
        }}
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt=""
      className="w-12 h-12 rounded-lg object-cover shrink-0"
      loading="lazy"
    />
  );
}

// ============================================================
// Modal fiche prospect
// ============================================================

const STATUTS: ProspectStatut[] = [
  'nouveau',
  'proposition_envoyee',
  'visite_planifiee',
  'signe',
  'perdu',
];

function ProspectModal({
  prospect,
  onClose,
  onUpdated,
}: {
  prospect: Prospect | null;
  onClose: () => void;
  onUpdated: (p: Prospect) => void;
}) {
  const [notes, setNotes] = useState('');
  const [statut, setStatut] = useState<ProspectStatut>('nouveau');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!prospect) return;
    setNotes(prospect.notes ?? '');
    setStatut(prospect.statut);
    setCopied(false);
  }, [prospect]);

  if (!prospect) return null;

  async function save() {
    if (!prospect) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes, statut }),
      });
      if (!r.ok) throw new Error('save error');
      const json = (await r.json()) as { prospect: Prospect };
      onUpdated(json.prospect);
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!prospect?.proposition_id) return;
    const url = `${window.location.origin}/proposition/${prospect.proposition_id}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const vueProposition = prospect.proposition_vue_at
    ? `Vue le ${new Date(prospect.proposition_vue_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : prospect.proposition_id
      ? 'Pas encore consultée'
      : null;

  return (
    <Modal
      open={Boolean(prospect)}
      onClose={onClose}
      title={`${prospect.prenom} ${prospect.nom}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* === EN-TÊTE : photo satellite + identité === */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3">
            <SatellitePhoto
              lat={prospect.latitude}
              lng={prospect.longitude}
              height={240}
              zoom={20}
              alt={`Vue satellite — ${prospect.adresse}`}
            />
            <div className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {prospect.adresse}, {prospect.ville}{' '}
              {prospect.code_postal ?? ''}
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3">
            <StatutBadge statut={prospect.statut} />
            <div>
              <div className="text-[11px] uppercase tracking-wide font-bold text-text-muted">
                Score solaire
              </div>
              <div
                className="font-display text-4xl font-bold leading-none mt-1"
                style={{ color: '#F5821F' }}
              >
                {prospect.score_solaire ?? '—'}
                {prospect.score_solaire !== null && (
                  <span className="text-base text-text-muted">/100</span>
                )}
              </div>
              {prospect.score_solaire !== null && (
                <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${prospect.score_solaire}%`,
                      background:
                        'linear-gradient(90deg, #F5821F, #D96B0A)',
                    }}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniKpi
                icon={Calendar}
                label="Créé"
                value={new Date(prospect.created_at).toLocaleDateString(
                  'fr-FR',
                )}
              />
              <MiniKpi
                icon={Sun}
                label="Qualité"
                value={prospect.qualite_imagerie ?? '—'}
              />
            </div>
          </div>
        </div>

        {/* === CONTACT === */}
        <section>
          <SectionTitle icon={Mail}>Contact</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info icon={Mail} label="Email" value={prospect.email ?? '—'} />
            <Info
              icon={Phone}
              label="Téléphone"
              value={prospect.telephone ?? '—'}
            />
          </div>
        </section>

        {/* === ÉTUDE TECHNIQUE === */}
        {prospect.production_annuelle_kwh !== null && (
          <section>
            <SectionTitle icon={Sun}>Étude technique</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV
                icon={MapPin}
                k="Surface toit"
                v={`${prospect.surface_toit_m2 ?? '—'} m²`}
              />
              <KV
                icon={Zap}
                k="Puissance"
                v={`${prospect.puissance_kwc ?? '—'} kWc`}
              />
              <KV
                icon={Sun}
                k="Production"
                v={`${formatNumber(prospect.production_annuelle_kwh)} kWh/an`}
              />
              <KV
                icon={Compass}
                k="Orientation"
                v={prospect.orientation_principale ?? '—'}
              />
              <KV
                icon={Clock}
                k="Ensoleillement"
                v={
                  prospect.heures_ensoleillement
                    ? `${formatNumber(prospect.heures_ensoleillement)} h/an`
                    : '—'
                }
              />
              <KV
                icon={Sun}
                k="Panneaux"
                v={
                  prospect.nb_panneaux_recommande
                    ? `${prospect.nb_panneaux_recommande}`
                    : '—'
                }
              />
              <KV
                icon={Leaf}
                k="CO₂ évité"
                v={
                  prospect.co2_evite_kg_an
                    ? `${formatNumber(prospect.co2_evite_kg_an)} kg/an`
                    : '—'
                }
              />
              <KV
                icon={MapPin}
                k="Coordonnées"
                v={
                  prospect.latitude && prospect.longitude
                    ? `${prospect.latitude.toFixed(4)}, ${prospect.longitude.toFixed(4)}`
                    : '—'
                }
              />
            </div>
          </section>
        )}

        {/* === FINANCIER === */}
        {prospect.cout_installation_ttc !== null && (
          <section>
            <SectionTitle icon={Euro}>Financier</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV
                icon={Euro}
                k="Coût TTC"
                v={formatEuros(prospect.cout_installation_ttc)}
              />
              <KV
                icon={TrendingUp}
                k="Aides"
                v={formatEuros(prospect.aides_totales ?? 0)}
                accent="teal"
              />
              <KV
                icon={Euro}
                k="Reste à charge"
                v={
                  prospect.reste_a_charge
                    ? formatEuros(prospect.reste_a_charge)
                    : '—'
                }
                accent="orange"
              />
              <KV
                icon={Zap}
                k="Économie / an"
                v={
                  prospect.economie_annuelle
                    ? formatEuros(prospect.economie_annuelle)
                    : '—'
                }
                accent="teal"
              />
              <KV
                icon={Clock}
                k="ROI"
                v={
                  prospect.temps_retour_ans
                    ? `${prospect.temps_retour_ans} ans`
                    : '—'
                }
              />
            </div>
          </section>
        )}

        {/* === PROPOSITION === */}
        {prospect.proposition_id && (
          <section>
            <SectionTitle icon={Send}>Proposition commerciale</SectionTitle>
            <div
              className="rounded-card p-4 flex flex-wrap items-center justify-between gap-3"
              style={{
                background: '#FEF0E6',
                border: '1px solid #FCD7B4',
              }}
            >
              <div>
                <div className="font-semibold">
                  N° {prospect.proposition_id}
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {vueProposition}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/proposition/${prospect.proposition_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  <ExternalLink className="w-4 h-4" /> Ouvrir
                </a>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={copyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Lien copié' : 'Copier lien'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* === STATUT === */}
        <section>
          <SectionTitle>Statut commercial</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {STATUTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatut(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: statut === s ? '#0F1923' : '#F3F4F6',
                  color: statut === s ? '#fff' : '#374151',
                }}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* === NOTES === */}
        <section>
          <SectionTitle>Notes commerciales</SectionTitle>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={4}
            placeholder="Notes internes sur ce prospect…"
          />
        </section>

        {/* === ACTIONS === */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={save} loading={saving}>
            <Save className="w-4 h-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Mail;
}) {
  return (
    <h4 className="text-xs uppercase tracking-wide font-bold text-text-muted mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </h4>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg p-2 bg-background">
      <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg p-3 bg-background">
      <div className="text-xs uppercase tracking-wide font-bold text-text-muted flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

function KV({
  k,
  v,
  icon: Icon,
  accent,
}: {
  k: string;
  v: string | number;
  icon?: typeof Mail;
  accent?: 'orange' | 'teal';
}) {
  const color =
    accent === 'teal' ? '#0D7C66' : accent === 'orange' ? '#F5821F' : '#1F2937';
  return (
    <div className="rounded-lg p-2.5 bg-background">
      <div className="text-[11px] uppercase tracking-wide text-text-muted font-semibold flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {k}
      </div>
      <div
        className="font-display text-sm font-bold mt-0.5"
        style={{ color }}
      >
        {v}
      </div>
    </div>
  );
}
