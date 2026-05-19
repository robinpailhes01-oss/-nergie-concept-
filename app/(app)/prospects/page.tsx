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
} from 'lucide-react';
import { StatutBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatEuros, formatNumber } from '@/lib/financial';
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
                    <div className="font-semibold">
                      {p.prenom} {p.nom}
                    </div>
                    <div className="text-xs text-text-muted">{p.email ?? '—'}</div>
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

  return (
    <Modal
      open={Boolean(prospect)}
      onClose={onClose}
      title={`${prospect.prenom} ${prospect.nom}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info icon={Mail} label="Email" value={prospect.email ?? '—'} />
          <Info icon={Phone} label="Téléphone" value={prospect.telephone ?? '—'} />
          <Info
            icon={MapPin}
            label="Adresse"
            value={`${prospect.adresse}, ${prospect.ville} ${prospect.code_postal ?? ''}`}
          />
          <Info
            icon={MapPin}
            label="Création"
            value={new Date(prospect.created_at).toLocaleDateString('fr-FR')}
          />
        </div>

        {/* Données techniques */}
        {prospect.production_annuelle_kwh && (
          <div>
            <h4 className="text-xs uppercase tracking-wide font-bold text-text-muted mb-2">
              Étude technique
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KV k="Surface toit" v={`${prospect.surface_toit_m2 ?? '—'} m²`} />
              <KV k="Puissance" v={`${prospect.puissance_kwc ?? '—'} kWc`} />
              <KV k="Production" v={`${formatNumber(prospect.production_annuelle_kwh)} kWh/an`} />
              <KV k="Orientation" v={prospect.orientation_principale ?? '—'} />
              <KV k="Score solaire" v={`${prospect.score_solaire ?? '—'}/100`} />
              <KV k="Coût TTC" v={prospect.cout_installation_ttc ? formatEuros(prospect.cout_installation_ttc) : '—'} />
              <KV k="Reste à charge" v={prospect.reste_a_charge ? formatEuros(prospect.reste_a_charge) : '—'} />
              <KV k="ROI" v={prospect.temps_retour_ans ? `${prospect.temps_retour_ans} ans` : '—'} />
            </div>
          </div>
        )}

        {/* Statut */}
        <div>
          <label className="text-xs uppercase tracking-wide font-bold text-text-muted">
            Statut
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
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
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs uppercase tracking-wide font-bold text-text-muted">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input mt-1.5"
            rows={4}
            placeholder="Notes internes sur ce prospect…"
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-between pt-2 border-t border-border">
          {prospect.proposition_id ? (
            <div className="flex gap-2">
              <a
                href={`/proposition/${prospect.proposition_id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                <ExternalLink className="w-4 h-4" /> Ouvrir proposition
              </a>
              <button type="button" className="btn btn-ghost" onClick={copyLink}>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'Lien copié' : 'Copier lien'}
              </button>
            </div>
          ) : (
            <span className="text-sm text-text-muted">
              Pas encore de proposition générée
            </span>
          )}
          <Button onClick={save} loading={saving}>
            <Save className="w-4 h-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
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
    <div>
      <div className="text-xs uppercase tracking-wide font-bold text-text-muted flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-lg p-2.5 bg-background">
      <div className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">
        {k}
      </div>
      <div className="font-display text-sm font-bold mt-0.5">{v}</div>
    </div>
  );
}
