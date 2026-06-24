'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Search,
  Sun,
  Zap,
  TrendingUp,
  Leaf,
  Euro,
  Save,
  ExternalLink,
  Check,
  Compass,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { addLocalProspect, updateLocalProspect } from '@/lib/demo-store';
import { SatellitePhoto } from '@/components/ui/SatellitePhoto';
import {
  calculerFinancier,
  formatEuros,
  formatKwh,
  formatNumber,
} from '@/lib/financial';
import type {
  FinancialAnalysis,
  ProductionScenario,
  Prospect,
  SolarApiResponse,
} from '@/types';

const STEPS = [
  { emoji: '📡', label: 'Connexion aux données satellite' },
  { emoji: '🛰️', label: 'Analyse de la toiture' },
  { emoji: '☀️', label: 'Calcul du potentiel solaire' },
  { emoji: '💰', label: 'Estimation du ROI' },
];

function AnalyseInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('address') ?? '';

  const [address, setAddress] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<SolarApiResponse | null>(null);
  const [selectedKwc, setSelectedKwc] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedProspect, setSavedProspect] = useState<Prospect | null>(null);

  const [generatingProp, setGeneratingProp] = useState(false);

  useEffect(() => {
    if (initial) void run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(addr: string) {
    if (!addr.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSavedProspect(null);
    setStepIndex(0);

    const stepInterval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 600);

    try {
      const r = await fetch(`/api/solar?address=${encodeURIComponent(addr)}`);
      if (!r.ok) throw new Error('Erreur API');
      const json = (await r.json()) as SolarApiResponse;
      setData(json);
      setSelectedKwc(json.production.kwc);
    } catch {
      setError('Analyse impossible. Réessayer.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void run(address);
  };

  const currentScenario: ProductionScenario | null =
    data && selectedKwc !== null
      ? data.scenarios.find((s) => s.kwc === selectedKwc) ?? data.production
      : null;

  const fin: FinancialAnalysis | null = currentScenario
    ? calculerFinancier(currentScenario.kwc, currentScenario.production_annuelle_kwh)
    : null;

  async function handleSave(contact: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  }) {
    if (!data || !currentScenario || !fin) return;
    setSaving(true);
    try {
      const payload = {
        ...contact,
        adresse: data.geocode.adresse,
        ville: data.geocode.ville,
        code_postal: data.geocode.code_postal,
        latitude: data.geocode.latitude,
        longitude: data.geocode.longitude,
        surface_toit_m2: data.toiture.surface_m2,
        nb_panneaux_recommande: currentScenario.nb_panneaux,
        production_annuelle_kwh: currentScenario.production_annuelle_kwh,
        heures_ensoleillement: data.toiture.heures_ensoleillement,
        orientation_principale: data.toiture.orientation_principale,
        score_solaire: data.score_solaire,
        qualite_imagerie: data.qualite,
        puissance_kwc: currentScenario.kwc,
        cout_installation_ttc: fin.cout_installation_ttc,
        aides_totales: fin.aides_totales,
        reste_a_charge: fin.reste_a_charge,
        economie_annuelle: fin.economie_annuelle,
        temps_retour_ans: fin.temps_retour_ans,
        co2_evite_kg_an: fin.co2_evite_kg_an,
        statut: 'nouveau' as const,
      };

      const r = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Erreur sauvegarde');
      const json = (await r.json()) as { prospect: Prospect; demo?: boolean };
      if (json.demo) addLocalProspect(json.prospect);
      setSavedProspect(json.prospect);
      setSaveOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenererProposition() {
    if (!savedProspect || !data || !currentScenario) return;
    setGeneratingProp(true);
    try {
      const r = await fetch('/api/proposition', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prospect_id: savedProspect.id,
          kwc: currentScenario.kwc,
          production_kwh: currentScenario.production_annuelle_kwh,
          toiture: {
            surface_m2: data.toiture.surface_m2,
            nb_panneaux: currentScenario.nb_panneaux,
            orientation: data.toiture.orientation_principale,
            heures_ensoleillement: data.toiture.heures_ensoleillement,
            score_solaire: data.score_solaire,
            qualite_imagerie: data.qualite,
          },
        }),
      });
      if (r.ok) {
        const json = (await r.json()) as { proposition_id: string };
        router.push(`/proposition/${json.proposition_id}`);
        return;
      }
      // Mode démo : prospect en localStorage, non visible côté serveur.
      // On génère la proposition localement.
      const fin = calculerFinancier(
        currentScenario.kwc,
        currentScenario.production_annuelle_kwh,
      );
      const propId = `prop_${Math.random().toString(36).slice(2, 10)}`;
      updateLocalProspect(savedProspect.id, {
        puissance_kwc: currentScenario.kwc,
        nb_panneaux_recommande: currentScenario.nb_panneaux,
        production_annuelle_kwh: currentScenario.production_annuelle_kwh,
        surface_toit_m2: data.toiture.surface_m2,
        heures_ensoleillement: data.toiture.heures_ensoleillement,
        orientation_principale: data.toiture.orientation_principale,
        score_solaire: data.score_solaire,
        qualite_imagerie: data.qualite,
        cout_installation_ttc: fin.cout_installation_ttc,
        aides_totales: fin.aides_totales,
        reste_a_charge: fin.reste_a_charge,
        economie_annuelle: fin.economie_annuelle,
        temps_retour_ans: fin.temps_retour_ans,
        co2_evite_kg_an: fin.co2_evite_kg_an,
        statut: 'proposition_envoyee',
        proposition_id: propId,
      });
      router.push(`/proposition/${propId}`);
    } finally {
      setGeneratingProp(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto stagger">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Analyse solaire</h1>
        <p className="text-text-muted mt-1">
          Saisissez une adresse pour obtenir une étude détaillée et générer
          une proposition commerciale.
        </p>
      </header>

      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ex : 14 rue de la Loge, Montpellier"
              className="input pl-9 h-12"
            />
          </div>
          <Button onClick={() => run(address)} loading={loading}>
            {!loading && <Search className="w-4 h-4" />} Lancer l'analyse
          </Button>
        </div>
      </div>

      {loading && <LoadingSteps activeIndex={stepIndex} />}

      {error && (
        <div className="card text-red-700 bg-red-50 border-red-200">{error}</div>
      )}

      {data && currentScenario && fin && (
        <>
          {data.demo && (
            <div className="mb-4 inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide"
              style={{ background: '#FEF3C7', color: '#92400E' }}>
              Mode démo — données simulées
            </div>
          )}

          {/* Toiture */}
          <ToitureCard data={data} />

          {/* Scénarios */}
          <ScenariosBlock
            scenarios={data.scenarios}
            recommended={data.production.kwc}
            selected={selectedKwc ?? data.production.kwc}
            onSelect={setSelectedKwc}
          />

          {/* Récap financier */}
          <FinancialBlock fin={fin} />

          {/* Projection 25 ans */}
          <ProjectionTable fin={fin} />

          {/* CTA */}
          <div className="card flex flex-col md:flex-row gap-3 justify-between items-center">
            <div>
              <h3 className="font-display text-lg font-bold">
                {savedProspect
                  ? `Prospect enregistré : ${savedProspect.prenom} ${savedProspect.nom}`
                  : 'Enregistrer ce prospect'}
              </h3>
              <p className="text-sm text-text-muted">
                {savedProspect
                  ? 'Vous pouvez maintenant générer la proposition commerciale.'
                  : "Sauvegardez l'analyse pour suivre le prospect dans le pipeline."}
              </p>
            </div>
            <div className="flex gap-2">
              {!savedProspect ? (
                <Button onClick={() => setSaveOpen(true)}>
                  <Save className="w-4 h-4" /> Sauvegarder prospect
                </Button>
              ) : (
                <Button
                  variant="teal"
                  onClick={handleGenererProposition}
                  loading={generatingProp}
                >
                  {!generatingProp && <ExternalLink className="w-4 h-4" />}{' '}
                  Générer la proposition
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      <SaveModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

// ============================================================
// Sub-composants
// ============================================================

function LoadingSteps({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="card">
      <div className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 transition-opacity"
              style={{ opacity: done ? 0.55 : active ? 1 : 0.35 }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{
                  background: done
                    ? '#D1FAE5'
                    : active
                      ? '#FEF0E6'
                      : '#F3F4F6',
                }}
              >
                {done ? <Check className="w-4 h-4 text-emerald-600" /> : s.emoji}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{s.label}</div>
              </div>
              {active && <div className="spinner spinner-dark" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToitureCard({ data }: { data: SolarApiResponse }) {
  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-4 h-4" style={{ color: '#F5821F' }} />
        <h2 className="font-display text-xl font-bold">Votre toiture</h2>
      </div>

      <div className="mb-5">
        <SatellitePhoto
          lat={data.geocode.latitude}
          lng={data.geocode.longitude}
          height={320}
          zoom={20}
          alt={`Vue satellite — ${data.geocode.adresse}`}
        />
        <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.geocode.adresse}, {data.geocode.ville}{' '}
            {data.geocode.code_postal}
          </span>
          {data.imagery_date && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              📅 Image satellite : {data.imagery_date}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          icon={MapPin}
          label="Surface utilisable"
          value={`${data.toiture.surface_m2.toFixed(0)} m²`}
        />
        <Stat
          icon={Compass}
          label="Orientation"
          value={data.toiture.orientation_principale}
        />
        <Stat
          icon={Clock}
          label="Ensoleillement"
          value={`${formatNumber(data.toiture.heures_ensoleillement)} h/an`}
        />
        <Stat
          icon={ImageIcon}
          label="Qualité imagerie"
          value={data.qualite}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <div className="text-xs uppercase font-semibold tracking-wide text-text-muted">
            Score solaire
          </div>
          <div className="font-display text-5xl font-bold mt-1" style={{ color: '#F5821F' }}>
            {data.score_solaire}
            <span className="text-xl text-text-muted">/100</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="h-3 rounded-full bg-background overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${data.score_solaire}%`,
                background: 'linear-gradient(90deg, #F5821F, #D96B0A)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1.5">
            <span>Faible</span>
            <span>Moyen</span>
            <span>Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="rounded-lg p-3 bg-background">
      <div className="flex items-center gap-1.5 text-text-muted text-xs uppercase tracking-wide font-semibold">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function ScenariosBlock({
  scenarios,
  recommended,
  selected,
  onSelect,
}: {
  scenarios: ProductionScenario[];
  recommended: number;
  selected: number;
  onSelect: (kwc: number) => void;
}) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-xl font-bold mb-3">Scénarios d'installation</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s) => {
          const isReco = s.kwc === recommended;
          const isSelected = s.kwc === selected;
          const fin = calculerFinancier(s.kwc, s.production_annuelle_kwh);
          return (
            <button
              type="button"
              key={s.kwc}
              onClick={() => onSelect(s.kwc)}
              className="text-left card transition-all hover:shadow-card-hover"
              style={{
                border: isSelected
                  ? '2px solid #F5821F'
                  : '1px solid rgba(15,25,35,0.04)',
                background: isReco ? '#FEF0E6' : '#fff',
              }}
            >
              {isReco && (
                <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide mb-2"
                  style={{ background: '#F5821F', color: '#fff' }}>
                  Recommandé
                </div>
              )}
              <div className="font-display text-3xl font-bold">{s.kwc} kWc</div>
              <div className="text-sm text-text-muted">{s.nb_panneaux} panneaux</div>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row k="Production" v={`${formatNumber(s.production_annuelle_kwh)} kWh/an`} />
                <Row k="Coût TTC" v={formatEuros(fin.cout_installation_ttc)} />
                <Row k="Reste à charge" v={formatEuros(fin.reste_a_charge)} />
                <Row k="Économie / an" v={formatEuros(fin.economie_annuelle)} accent />
                <Row k="ROI" v={`${fin.temps_retour_ans} ans`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{k}</span>
      <span className="font-semibold" style={accent ? { color: '#0D7C66' } : undefined}>
        {v}
      </span>
    </div>
  );
}

function FinancialBlock({ fin }: { fin: FinancialAnalysis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Mini
        icon={Euro}
        label="Coût total TTC"
        value={formatEuros(fin.cout_installation_ttc)}
        sub={`TVA ${(fin.taux_tva * 100).toFixed(0)}%`}
      />
      <Mini
        icon={TrendingUp}
        label="Reste à charge"
        value={formatEuros(fin.reste_a_charge)}
        sub={`Aides : ${formatEuros(fin.aides_totales)}`}
        accent="orange"
      />
      <Mini
        icon={Zap}
        label="Économie annuelle"
        value={formatEuros(fin.economie_annuelle)}
        sub={`Sur 25 ans : ${formatEuros(fin.gain_25_ans)}`}
        accent="teal"
      />
      <Mini
        icon={Leaf}
        label="CO₂ évité"
        value={`${formatNumber(fin.co2_evite_kg_an)} kg/an`}
        sub={`≈ ${formatNumber(fin.arbres_equivalent)} arbres`}
        accent="teal"
      />
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  sub: string;
  accent?: 'orange' | 'teal';
}) {
  const color =
    accent === 'teal' ? '#0D7C66' : accent === 'orange' ? '#F5821F' : '#1F2937';
  return (
    <div className="card">
      <div className="flex items-center gap-1.5 text-text-muted text-xs uppercase tracking-wide font-semibold">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="font-display text-2xl font-bold mt-1.5" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-text-muted mt-1">{sub}</div>
    </div>
  );
}

function ProjectionTable({ fin }: { fin: FinancialAnalysis }) {
  const rows = [1, 5, 10, 15, 20, 25]
    .map((y) => fin.projection[y - 1])
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <div className="card mb-6">
      <h2 className="font-display text-xl font-bold mb-3">Projection 25 ans</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
              <th className="pb-3 pr-4">Année</th>
              <th className="pb-3 pr-4">Production</th>
              <th className="pb-3 pr-4">Économie / an</th>
              <th className="pb-3">Cumulé</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.annee} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-4 font-semibold">Année {p.annee}</td>
                <td className="py-2.5 pr-4">{formatKwh(p.production_kwh)}</td>
                <td className="py-2.5 pr-4">{formatEuros(p.economie)}</td>
                <td className="py-2.5 font-semibold" style={{ color: '#0D7C66' }}>
                  {formatEuros(p.economie_cumulee)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SaveModal({
  open,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (c: { nom: string; prenom: string; email: string; telephone: string }) => void;
  saving: boolean;
}) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Informations prospect">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase font-semibold text-text-muted">
              Prénom *
            </label>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-semibold text-text-muted">
              Nom *
            </label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="input mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-text-muted">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            type="email"
          />
        </div>
        <div>
          <label className="text-xs uppercase font-semibold text-text-muted">
            Téléphone
          </label>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="input mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            onClick={() => onSave({ nom, prenom, email, telephone })}
            loading={saving}
            disabled={!nom || !prenom}
          >
            <Save className="w-4 h-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AnalysePage() {
  return (
    <Suspense fallback={<div className="text-text-muted">Chargement…</div>}>
      <AnalyseInner />
    </Suspense>
  );
}
