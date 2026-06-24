'use client';

import { useState } from 'react';
import {
  Search,
  MapPin,
  Sun,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Home,
  Building2,
  Hash,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  calculerFinancier,
  formatEuros,
} from '@/lib/financial';
import { getStaticSatelliteUrl } from '@/lib/satellite';
import { addLocalProspect } from '@/lib/demo-store';
import {
  CATEGORIES,
  EFFECTIF_LABELS,
  SECTION_LABELS,
  SECTIONS_SOLAR_PRIORITAIRES,
  nomsCorrespondent,
} from '@/lib/entreprises';
import type { Prospect, SolarApiResponse } from '@/types';

type Mode = 'particuliers' | 'entreprises' | 'equipes';

interface InstallationConnue {
  nom: string;
  puissance_kw: number;
  annee: number | null;
}

interface EntrepriseMeta {
  siren: string;
  nom: string;
  naf: string;
  section: string;
  effectif: string;
  effectif_label: string;
  categorie: string;
}

interface ScannedAddress {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  status: 'pending' | 'loading' | 'done' | 'error';
  solar?: SolarApiResponse;
  prospect_id?: string;
  entreprise?: EntrepriseMeta;
  deja_equipee?: InstallationConnue;
}

interface FoundStreet {
  street: string;
  city: string;
  postcode: string;
}

const PARALLEL_WORKERS = 3;

export default function ProspectionPage() {
  const [mode, setMode] = useState<Mode>('entreprises');

  return (
    <div className="max-w-7xl mx-auto stagger">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F5821F, #D96B0A)' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">Prospection de masse</h1>
        </div>
        <p className="text-text-muted">
          Identifie automatiquement les meilleurs prospects dans le Gard (30)
          et l'Hérault (34) — particuliers ou entreprises.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <ModeTab
          active={mode === 'entreprises'}
          icon={Building2}
          onClick={() => setMode('entreprises')}
        >
          Entreprises
          <span
            className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: '#F5821F', color: '#fff' }}
          >
            B2B
          </span>
        </ModeTab>
        <ModeTab
          active={mode === 'particuliers'}
          icon={Home}
          onClick={() => setMode('particuliers')}
        >
          Particuliers
        </ModeTab>
        <ModeTab
          active={mode === 'equipes'}
          icon={Sun}
          onClick={() => setMode('equipes')}
        >
          Déjà équipés
          <span
            className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: '#0D7C66', color: '#fff' }}
          >
            Maintenance
          </span>
        </ModeTab>
      </div>

      {mode === 'entreprises' ? (
        <ScannerEntreprises />
      ) : mode === 'equipes' ? (
        <ScannerEquipes />
      ) : (
        <ScannerParticuliers />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
      style={{
        borderColor: active ? '#F5821F' : 'transparent',
        color: active ? '#F5821F' : '#6B7280',
      }}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ============================================================
// Mode ENTREPRISES (B2B via SIRENE)
// ============================================================

function ScannerEntreprises() {
  const [codePostal, setCodePostal] = useState('');
  const [taille, setTaille] = useState('PME');
  const [secteur, setSecteur] = useState('');
  const [limit, setLimit] = useState(15);
  const [addresses, setAddresses] = useState<ScannedAddress[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [totalDispo, setTotalDispo] = useState<number | null>(null);

  async function search() {
    if (!codePostal.trim()) {
      setError('Renseigne un code postal (ex : 34170).');
      return;
    }
    if (!/^\d{5}$/.test(codePostal.trim())) {
      setError('Code postal invalide (5 chiffres).');
      return;
    }
    setSearching(true);
    setError(null);
    setAddresses([]);
    setProgress({ done: 0, total: 0 });
    setTotalDispo(null);
    try {
      const qs = new URLSearchParams({
        code_postal: codePostal.trim(),
        limit: String(limit),
      });
      if (taille) qs.set('taille', taille);
      if (secteur) qs.set('secteur', secteur);
      const r = await fetch(`/api/prospection-entreprises?${qs.toString()}`);
      const json = (await r.json()) as
        | {
            entreprises: Array<ScannedAddress & { entreprise: EntrepriseMeta }>;
            count: number;
            total: number;
          }
        | { error: string };
      if (!r.ok || !('entreprises' in json)) {
        setError('error' in json ? json.error : 'Erreur recherche');
        return;
      }
      if (json.entreprises.length === 0) {
        setError(
          'Aucune entreprise ne correspond aux critères dans ce code postal.',
        );
        return;
      }
      const liste = json.entreprises.map((e) => ({
        ...e,
        status: 'pending' as const,
      }));
      setAddresses(liste);
      setTotalDispo(json.total);
      void flagDejaEquipees(liste);
    } catch {
      setError('Recherche entreprises impossible.');
    } finally {
      setSearching(false);
    }
  }

  async function flagDejaEquipees(liste: ScannedAddress[]) {
    const villes = [...new Set(liste.map((a) => a.city).filter(Boolean))];
    const parVille = new Map<string, InstallationConnue[]>();
    await Promise.all(
      villes.map(async (ville) => {
        try {
          const r = await fetch(
            `/api/installations-existantes?names_only=1&commune=${encodeURIComponent(ville)}`,
          );
          if (!r.ok) return;
          const j = (await r.json()) as {
            installations: InstallationConnue[];
          };
          parVille.set(ville, j.installations ?? []);
        } catch {
          /* flag best-effort */
        }
      }),
    );
    setAddresses((all) =>
      all.map((a) => {
        const installs = parVille.get(a.city) ?? [];
        const nomCible = a.entreprise?.nom ?? '';
        const match = installs.find((inst) =>
          nomsCorrespondent(nomCible, inst.nom),
        );
        return match ? { ...a, deja_equipee: match } : a;
      }),
    );
  }

  async function scan() {
    if (addresses.length === 0) return;
    setScanning(true);
    setProgress({ done: 0, total: addresses.length });

    let cursor = 0;
    let done = 0;

    async function worker(): Promise<void> {
      while (cursor < addresses.length) {
        const i = cursor++;
        const target = addresses[i];
        if (!target) continue;
        setAddresses((all) => {
          const copy = [...all];
          if (copy[i]) copy[i] = { ...copy[i]!, status: 'loading' };
          return copy;
        });
        try {
          const r = await fetch(
            `/api/solar?address=${encodeURIComponent(target.label)}`,
          );
          if (!r.ok) throw new Error();
          const solar = (await r.json()) as SolarApiResponse;
          setAddresses((all) => {
            const copy = [...all];
            if (copy[i]) {
              copy[i] = { ...copy[i]!, status: 'done', solar };
            }
            return copy;
          });
        } catch {
          setAddresses((all) => {
            const copy = [...all];
            if (copy[i]) copy[i] = { ...copy[i]!, status: 'error' };
            return copy;
          });
        }
        done++;
        setProgress({ done, total: addresses.length });
      }
    }
    await Promise.all(
      Array.from({ length: PARALLEL_WORKERS }, () => worker()),
    );
    setScanning(false);
  }

  async function addToPipeline(addr: ScannedAddress, idx: number) {
    if (!addr.solar) return;
    const fin = calculerFinancier(
      addr.solar.production.kwc,
      addr.solar.production.production_annuelle_kwh,
    );
    const ent = addr.entreprise;
    const notes = ent
      ? `Entreprise identifiée via SIRENE :
SIREN : ${ent.siren}
Activité (NAF) : ${ent.naf} — ${SECTION_LABELS[ent.section] ?? ent.section}
Effectif : ${ent.effectif_label}
Catégorie : ${ent.categorie}
Ajoutée le ${new Date().toLocaleDateString('fr-FR')}.`
      : `Identifiée via prospection le ${new Date().toLocaleDateString('fr-FR')}.`;
    const payload = {
      nom: ent?.nom ?? 'Entreprise',
      prenom: '(B2B)',
      email: null,
      telephone: null,
      adresse: addr.label,
      ville: addr.city,
      code_postal: addr.postcode,
      latitude: addr.lat,
      longitude: addr.lng,
      surface_toit_m2: addr.solar.toiture.surface_m2,
      nb_panneaux_recommande: addr.solar.production.nb_panneaux,
      production_annuelle_kwh: addr.solar.production.production_annuelle_kwh,
      heures_ensoleillement: addr.solar.toiture.heures_ensoleillement,
      orientation_principale: addr.solar.toiture.orientation_principale,
      score_solaire: addr.solar.score_solaire,
      qualite_imagerie: addr.solar.qualite,
      puissance_kwc: addr.solar.production.kwc,
      cout_installation_ttc: fin.cout_installation_ttc,
      aides_totales: fin.aides_totales,
      reste_a_charge: fin.reste_a_charge,
      economie_annuelle: fin.economie_annuelle,
      temps_retour_ans: fin.temps_retour_ans,
      co2_evite_kg_an: fin.co2_evite_kg_an,
      statut: 'nouveau' as const,
      notes,
    };
    try {
      const r = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('post failed');
      const j = (await r.json()) as { prospect: Prospect; demo?: boolean };
      if (j.demo) addLocalProspect(j.prospect);
      setAddresses((all) => {
        const copy = [...all];
        if (copy[idx]) {
          copy[idx] = { ...copy[idx]!, prospect_id: j.prospect.id };
        }
        return copy;
      });
    } catch {
      window.alert(
        "Ajout au pipeline impossible. Vérifie ta connexion et réessaie.",
      );
    }
  }

  const sorted = [...addresses]
    .map((a, originalIdx) => ({ a, originalIdx }))
    .sort(
      (x, y) =>
        (y.a.solar?.score_solaire ?? -1) - (x.a.solar?.score_solaire ?? -1),
    );

  const doneCount = addresses.filter((a) => a.status === 'done').length;
  const allDone = addresses.length > 0 && doneCount === addresses.length;
  const coutEstime = addresses.length * 0.05;

  return (
    <>
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={codePostal}
              onChange={(e) =>
                setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))
              }
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              placeholder="Code postal (34170…)"
              className="input pl-9 h-12"
              inputMode="numeric"
            />
          </div>
          <select
            value={taille}
            onChange={(e) => setTaille(e.target.value)}
            className="input h-12"
          >
            <option value="">Toutes tailles</option>
            {CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            className="input h-12"
          >
            <option value="">Tous secteurs</option>
            {SECTIONS_SOLAR_PRIORITAIRES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input h-12"
          >
            <option value={5}>5 entreprises</option>
            <option value={10}>10 entreprises</option>
            <option value={15}>15 entreprises</option>
            <option value={25}>25 entreprises</option>
          </select>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={search} loading={searching}>
            {!searching && <Search className="w-4 h-4" />} Trouver les entreprises
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-3">
          🏢 Source : <strong>SIRENE / INSEE</strong> via l'API officielle de l'État.
          Sièges sociaux actifs uniquement, géolocalisés dans le code postal demandé.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {addresses.length > 0 && (
        <>
          <ScanBanner
            total={addresses.length}
            doneCount={doneCount}
            scanning={scanning}
            allDone={allDone}
            progress={progress}
            coutEstime={coutEstime}
            onScan={scan}
            title={`${addresses.length} entreprise${addresses.length > 1 ? 's' : ''} trouvée${addresses.length > 1 ? 's' : ''}`}
            subtitle={
              totalDispo !== null && totalDispo > addresses.length
                ? `${totalDispo} entreprises disponibles au total dans la zone — augmente la limite si besoin`
                : null
            }
          />

          <div className="card">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                    <th className="pb-3 pr-3">#</th>
                    <th className="pb-3 pr-4">Entreprise</th>
                    <th className="pb-3 pr-4">Activité</th>
                    <th className="pb-3 pr-4">Effectif</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Économie/an</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ a, originalIdx }, displayIdx) => (
                    <RowEntreprise
                      key={a.label + originalIdx}
                      rank={displayIdx + 1}
                      address={a}
                      onAdd={() => addToPipeline(a, originalIdx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// Mode PARTICULIERS (par rue, via BAN)
// ============================================================

function ScannerParticuliers() {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [addresses, setAddresses] = useState<ScannedAddress[]>([]);
  const [foundStreet, setFoundStreet] = useState<FoundStreet | null>(null);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (query.trim().length < 3) return;
    setSearching(true);
    setError(null);
    setAddresses([]);
    setFoundStreet(null);
    setProgress({ done: 0, total: 0 });
    try {
      const r = await fetch(
        `/api/prospection?q=${encodeURIComponent(query)}&limit=${limit}`,
      );
      const json = (await r.json()) as
        | {
            addresses: ScannedAddress[];
            count: number;
            street: string;
            city: string;
            postcode: string;
          }
        | { error: string };
      if (!r.ok || !('addresses' in json)) {
        setError('error' in json ? json.error : 'Erreur');
        return;
      }
      if (json.addresses.length === 0) {
        setError("Aucune adresse trouvée.");
        return;
      }
      setFoundStreet({
        street: json.street,
        city: json.city,
        postcode: json.postcode,
      });
      setAddresses(
        json.addresses.map((a) => ({ ...a, status: 'pending' as const })),
      );
    } catch {
      setError('Recherche impossible.');
    } finally {
      setSearching(false);
    }
  }

  async function scan() {
    if (addresses.length === 0) return;
    setScanning(true);
    setProgress({ done: 0, total: addresses.length });
    let cursor = 0;
    let done = 0;
    async function worker(): Promise<void> {
      while (cursor < addresses.length) {
        const i = cursor++;
        const target = addresses[i];
        if (!target) continue;
        setAddresses((all) => {
          const copy = [...all];
          if (copy[i]) copy[i] = { ...copy[i]!, status: 'loading' };
          return copy;
        });
        try {
          const r = await fetch(
            `/api/solar?address=${encodeURIComponent(target.label)}`,
          );
          if (!r.ok) throw new Error();
          const solar = (await r.json()) as SolarApiResponse;
          setAddresses((all) => {
            const copy = [...all];
            if (copy[i]) copy[i] = { ...copy[i]!, status: 'done', solar };
            return copy;
          });
        } catch {
          setAddresses((all) => {
            const copy = [...all];
            if (copy[i]) copy[i] = { ...copy[i]!, status: 'error' };
            return copy;
          });
        }
        done++;
        setProgress({ done, total: addresses.length });
      }
    }
    await Promise.all(
      Array.from({ length: PARALLEL_WORKERS }, () => worker()),
    );
    setScanning(false);
  }

  async function addToPipeline(addr: ScannedAddress, idx: number) {
    if (!addr.solar) return;
    const fin = calculerFinancier(
      addr.solar.production.kwc,
      addr.solar.production.production_annuelle_kwh,
    );
    const payload = {
      nom: 'À qualifier',
      prenom: addr.label.split(',')[0]?.trim() ?? 'Prospect',
      email: null,
      telephone: null,
      adresse: addr.label,
      ville: addr.city,
      code_postal: addr.postcode,
      latitude: addr.lat,
      longitude: addr.lng,
      surface_toit_m2: addr.solar.toiture.surface_m2,
      nb_panneaux_recommande: addr.solar.production.nb_panneaux,
      production_annuelle_kwh: addr.solar.production.production_annuelle_kwh,
      heures_ensoleillement: addr.solar.toiture.heures_ensoleillement,
      orientation_principale: addr.solar.toiture.orientation_principale,
      score_solaire: addr.solar.score_solaire,
      qualite_imagerie: addr.solar.qualite,
      puissance_kwc: addr.solar.production.kwc,
      cout_installation_ttc: fin.cout_installation_ttc,
      aides_totales: fin.aides_totales,
      reste_a_charge: fin.reste_a_charge,
      economie_annuelle: fin.economie_annuelle,
      temps_retour_ans: fin.temps_retour_ans,
      co2_evite_kg_an: fin.co2_evite_kg_an,
      statut: 'nouveau' as const,
      notes: `Identifié via prospection de masse le ${new Date().toLocaleDateString('fr-FR')}.`,
    };
    try {
      const r = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('post failed');
      const j = (await r.json()) as { prospect: Prospect; demo?: boolean };
      if (j.demo) addLocalProspect(j.prospect);
      setAddresses((all) => {
        const copy = [...all];
        if (copy[idx]) copy[idx] = { ...copy[idx]!, prospect_id: j.prospect.id };
        return copy;
      });
    } catch {
      window.alert(
        "Ajout au pipeline impossible. Vérifie ta connexion et réessaie.",
      );
    }
  }

  const sorted = [...addresses]
    .map((a, originalIdx) => ({ a, originalIdx }))
    .sort(
      (x, y) =>
        (y.a.solar?.score_solaire ?? -1) - (x.a.solar?.score_solaire ?? -1),
    );

  const doneCount = addresses.filter((a) => a.status === 'done').length;
  const allDone = addresses.length > 0 && doneCount === addresses.length;
  const coutEstime = addresses.length * 0.05;

  return (
    <>
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              placeholder="Ex : rue des Pins, Castelnau-le-Lez"
              className="input pl-9 h-12"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input h-12 md:w-44"
          >
            <option value={5}>5 adresses</option>
            <option value={10}>10 adresses</option>
            <option value={20}>20 adresses</option>
            <option value={30}>30 adresses</option>
          </select>
          <Button onClick={search} loading={searching}>
            {!searching && <Search className="w-4 h-4" />} Trouver
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-3">
          🏠 Source : Base Adresse Nationale (BAN, gouv.fr). Énumération des
          numéros de rue dans le Gard (30) et l'Hérault (34) uniquement.
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {addresses.length > 0 && (
        <>
          <ScanBanner
            total={addresses.length}
            doneCount={doneCount}
            scanning={scanning}
            allDone={allDone}
            progress={progress}
            coutEstime={coutEstime}
            onScan={scan}
            title={`${addresses.length} adresse${addresses.length > 1 ? 's' : ''} trouvée${addresses.length > 1 ? 's' : ''}`}
            subtitle={
              foundStreet
                ? `${foundStreet.street}, ${foundStreet.city}`
                : null
            }
          />

          <div className="card">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                    <th className="pb-3 pr-3">#</th>
                    <th className="pb-3 pr-4">Adresse</th>
                    <th className="pb-3 pr-4">Surface</th>
                    <th className="pb-3 pr-4">Orientation</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 pr-4">Économie/an</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ a, originalIdx }, displayIdx) => (
                    <RowParticulier
                      key={a.label + originalIdx}
                      rank={displayIdx + 1}
                      address={a}
                      onAdd={() => addToPipeline(a, originalIdx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// Mode DÉJÀ ÉQUIPÉS (registre ODRÉ + jointure SIRENE)
// ============================================================

interface InstallationExistante {
  nom_installation: string;
  commune: string;
  code_insee: string | null;
  departement: string;
  puissance_kw: number;
  date_mise_en_service: string | null;
  annee: number | null;
  entreprise: {
    nom: string;
    siren: string;
    adresse: string;
    code_postal: string;
    ville: string;
    lat: number | null;
    lng: number | null;
    naf: string;
    confiance: 'haute' | 'moyenne';
  } | null;
}

function ScannerEquipes() {
  const [dept, setDept] = useState('34');
  const [commune, setCommune] = useState('');
  const [tri, setTri] = useState('anciennes');
  const [limit, setLimit] = useState(15);
  const [items, setItems] = useState<InstallationExistante[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  async function search() {
    setLoading(true);
    setError(null);
    setItems([]);
    setTotal(null);
    try {
      const qs = new URLSearchParams({
        dept,
        tri,
        limit: String(limit),
      });
      if (commune.trim()) qs.set('commune', commune.trim());
      const r = await fetch(`/api/installations-existantes?${qs.toString()}`);
      const json = (await r.json()) as
        | { installations: InstallationExistante[]; total: number }
        | { error: string };
      if (!r.ok || !('installations' in json)) {
        setError('error' in json ? json.error : 'Erreur registre');
        return;
      }
      if (json.installations.length === 0) {
        setError('Aucune installation trouvée avec ces critères.');
        return;
      }
      setItems(json.installations);
      setTotal(json.total);
    } catch {
      setError('Recherche impossible. Réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function addToPipeline(item: InstallationExistante) {
    const key = item.nom_installation + item.commune;
    const ent = item.entreprise;
    const age = item.annee ? new Date().getFullYear() - item.annee : null;
    const notes = `Lead MAINTENANCE / EXTENSION — installation solaire existante.
Installation : ${item.nom_installation}
Puissance : ${Math.round(item.puissance_kw)} kW · Mise en service : ${item.date_mise_en_service ?? 'inconnue'}${age !== null ? ` (${age} ans)` : ''}
Source : registre national ODRÉ${ent ? `
Entreprise SIRENE : ${ent.nom} (SIREN ${ent.siren}, confiance ${ent.confiance})` : ''}
Opportunités : entretien, remplacement micro-onduleurs, extension, batterie.`;
    const payload = {
      nom: ent?.nom ?? item.nom_installation,
      prenom: '(B2B équipé)',
      email: null,
      telephone: null,
      adresse: ent?.adresse ?? item.commune,
      ville: ent?.ville ?? item.commune,
      code_postal: ent?.code_postal ?? null,
      latitude: ent?.lat ?? null,
      longitude: ent?.lng ?? null,
      surface_toit_m2: null,
      nb_panneaux_recommande: null,
      production_annuelle_kwh: null,
      heures_ensoleillement: null,
      orientation_principale: null,
      score_solaire: null,
      qualite_imagerie: null,
      puissance_kwc: Math.round(item.puissance_kw),
      cout_installation_ttc: null,
      aides_totales: null,
      reste_a_charge: null,
      economie_annuelle: null,
      temps_retour_ans: null,
      co2_evite_kg_an: null,
      statut: 'nouveau' as const,
      notes,
    };
    try {
      const r = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('post failed');
      const j = (await r.json()) as { prospect: Prospect; demo?: boolean };
      if (j.demo) addLocalProspect(j.prospect);
      setAdded((a) => ({ ...a, [key]: true }));
    } catch {
      window.alert(
        "Ajout au pipeline impossible. Vérifie ta connexion et réessaie.",
      );
    }
  }

  return (
    <>
      <div
        className="card mb-6"
        style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
      >
        <p className="text-sm" style={{ color: '#065F46' }}>
          <strong>Entreprises déjà équipées en solaire</strong> — source :
          registre national des installations (ODRÉ / Enedis, open data).
          Cibles idéales pour la <strong>maintenance, le remplacement
          d'onduleurs, l'extension ou l'ajout de batteries</strong>. Le
          registre donne la commune ; l'adresse exacte est retrouvée
          automatiquement via SIRENE quand le nom correspond à une entreprise.
        </p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="input h-12"
          >
            <option value="34">Hérault (34)</option>
            <option value="30">Gard (30)</option>
            <option value="all">Les deux</option>
          </select>
          <div className="relative md:col-span-2">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
              placeholder="Commune (optionnel) — ex : Sète"
              className="input pl-9 h-12"
            />
          </div>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value)}
            className="input h-12"
          >
            <option value="anciennes">Plus anciennes (maintenance)</option>
            <option value="recentes">Plus récentes</option>
            <option value="puissance">Plus puissantes</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input h-12"
          >
            <option value={10}>10 résultats</option>
            <option value={15}>15 résultats</option>
            <option value={20}>20 résultats</option>
          </select>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={search} loading={loading}>
            {!loading && <Search className="w-4 h-4" />} Rechercher les installations
          </Button>
        </div>
        <p className="text-xs text-text-muted mt-3">
          ☀️ Plage 36 kW – 2 MW : toitures professionnelles (les fermes au sol
          géantes et les installations résidentielles anonymisées sont exclues).
        </p>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {items.length > 0 && (
        <>
          {total !== null && total > items.length && (
            <p className="text-sm text-text-muted mb-3">
              {total} installations correspondent au total — affichage des{' '}
              {items.length} premières.
            </p>
          )}
          <div className="card">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
                    <th className="pb-3 pr-4">Entreprise / installation</th>
                    <th className="pb-3 pr-4">Adresse</th>
                    <th className="pb-3 pr-4">Puissance</th>
                    <th className="pb-3 pr-4">Mise en service</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const key = item.nom_installation + item.commune;
                    const ent = item.entreprise;
                    const age = item.annee
                      ? new Date().getFullYear() - item.annee
                      : null;
                    return (
                      <tr
                        key={key}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-3 pr-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            {ent?.lat && ent?.lng ? (
                              <Thumbnail lat={ent.lat} lng={ent.lng} />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center"
                                style={{ background: '#ECFDF5' }}
                              >
                                <Sun
                                  className="w-5 h-5"
                                  style={{ color: '#0D7C66' }}
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {ent?.nom ?? item.nom_installation}
                              </div>
                              {ent && (
                                <div className="text-[10px] text-text-muted">
                                  SIREN {ent.siren} ·{' '}
                                  <span
                                    style={{
                                      color:
                                        ent.confiance === 'haute'
                                          ? '#0D7C66'
                                          : '#D97706',
                                    }}
                                  >
                                    match {ent.confiance}
                                  </span>
                                </div>
                              )}
                              {ent && ent.nom !== item.nom_installation && (
                                <div className="text-[10px] text-text-muted truncate">
                                  Installation : {item.nom_installation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          {ent?.adresse ? (
                            <span className="font-medium">{ent.adresse}</span>
                          ) : (
                            <span className="text-text-muted">
                              {item.commune} (commune seule —{' '}
                              <a
                                href={`https://www.google.com/maps/search/${encodeURIComponent(`${item.nom_installation} ${item.commune}`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                chercher sur Maps
                              </a>
                              )
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-display font-bold">
                            {Math.round(item.puissance_kw)} kW
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          {item.annee ?? '—'}
                          {age !== null && age >= 8 && (
                            <span
                              className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ background: '#FEF0E6', color: '#D96B0A' }}
                            >
                              {age} ans
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {added[key] ? (
                            <Link
                              href="/prospects"
                              className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-semibold"
                            >
                              <Check className="w-4 h-4" /> Ajouté
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToPipeline(item)}
                              className="btn btn-ghost py-1.5 px-3 text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Pipeline
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// Composants partagés
// ============================================================

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card mb-4 flex items-start gap-3"
      style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}
    >
      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
      {children}
    </div>
  );
}

function ScanBanner({
  total,
  doneCount,
  scanning,
  allDone,
  progress,
  coutEstime,
  onScan,
  title,
  subtitle,
}: {
  total: number;
  doneCount: number;
  scanning: boolean;
  allDone: boolean;
  progress: { done: number; total: number };
  coutEstime: number;
  onScan: () => void;
  title: string;
  subtitle: string | null;
}) {
  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="text-sm text-text-muted">
            {subtitle && <span>{subtitle} · </span>}
            Coût Google Solar estimé : ~{formatEuros(coutEstime)}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={onScan}
          loading={scanning}
          disabled={scanning || allDone}
        >
          {!scanning && <Sun className="w-4 h-4" />}
          {scanning
            ? `Scan ${progress.done}/${progress.total}`
            : allDone
              ? 'Scan terminé'
              : 'Lancer le scan solaire'}
        </Button>
      </div>
      {(scanning || allDone) && total > 0 && (
        <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(doneCount / total) * 100}%`,
              background: 'linear-gradient(90deg, #F5821F, #D96B0A)',
            }}
          />
        </div>
      )}
    </div>
  );
}

function Thumbnail({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
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
          background: 'linear-gradient(135deg, #FEF0E6 0%, #FCD7B4 100%)',
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

function ScoreCell({ status, score }: { status: ScannedAddress['status']; score: number | null }) {
  const scoreColor =
    score === null
      ? '#9CA3AF'
      : score >= 85
        ? '#0D7C66'
        : score >= 70
          ? '#F5821F'
          : '#9CA3AF';
  if (status === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-muted">
        <span className="spinner spinner-dark" /> scan…
      </span>
    );
  }
  if (status === 'pending') return <span className="text-text-muted">—</span>;
  if (status === 'error')
    return <span className="text-red-600 text-xs">échec</span>;
  if (score === null) return <span className="text-text-muted">—</span>;
  return (
    <span
      className="font-display text-lg font-bold"
      style={{ color: scoreColor }}
    >
      {score}
      <span className="text-xs text-text-muted">/100</span>
    </span>
  );
}

function ActionCell({
  address,
  onAdd,
}: {
  address: ScannedAddress;
  onAdd: () => void;
}) {
  if (address.prospect_id) {
    return (
      <Link
        href={`/prospects`}
        className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-semibold"
      >
        <Check className="w-4 h-4" /> Ajouté
      </Link>
    );
  }
  if (address.solar) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="btn btn-ghost py-1.5 px-3 text-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Pipeline
      </button>
    );
  }
  return (
    <Link
      href={`/analyse?address=${encodeURIComponent(address.label)}`}
      className="text-xs text-text-muted hover:text-orange inline-flex items-center gap-1"
    >
      Analyser <ExternalLink className="w-3 h-3" />
    </Link>
  );
}

// ============================================================
// Rows
// ============================================================

function RowEntreprise({
  rank,
  address,
  onAdd,
}: {
  rank: number;
  address: ScannedAddress;
  onAdd: () => void;
}) {
  const fin = address.solar
    ? calculerFinancier(
        address.solar.production.kwc,
        address.solar.production.production_annuelle_kwh,
      )
    : null;
  const score = address.solar?.score_solaire ?? null;
  const isTop3 = address.status === 'done' && rank <= 3;
  const ent = address.entreprise;

  return (
    <tr
      className="border-b border-border/60 last:border-0"
      style={isTop3 ? { background: '#FEF0E6' } : undefined}
    >
      <td className="py-3 pr-3 align-top">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{
            background: isTop3 ? '#F5821F' : '#F3F4F6',
            color: isTop3 ? '#fff' : '#6B7280',
          }}
        >
          {rank}
        </div>
      </td>
      <td className="py-3 pr-4 max-w-xs">
        <div className="flex items-center gap-3">
          <Thumbnail lat={address.lat} lng={address.lng} />
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {ent?.nom ?? '—'}
            </div>
            <div className="text-xs text-text-muted truncate">
              {address.label}
            </div>
            {ent?.siren && (
              <div className="text-[10px] text-text-muted mt-0.5">
                SIREN {ent.siren} · {ent.categorie}
              </div>
            )}
            {address.deja_equipee && (
              <div
                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: '#FEE2E2', color: '#991B1B' }}
              >
                ⚠️ Déjà équipée ({Math.round(address.deja_equipee.puissance_kw)} kW
                {address.deja_equipee.annee
                  ? `, ${address.deja_equipee.annee}`
                  : ''})
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="text-xs">
          {ent ? SECTION_LABELS[ent.section] ?? ent.section : '—'}
        </div>
        <div className="text-[10px] text-text-muted">
          {ent?.naf}
        </div>
      </td>
      <td className="py-3 pr-4 text-xs">
        {ent ? EFFECTIF_LABELS[ent.effectif] ?? '—' : '—'}
      </td>
      <td className="py-3 pr-4">
        <ScoreCell status={address.status} score={score} />
      </td>
      <td className="py-3 pr-4 font-semibold">
        {fin ? formatEuros(fin.economie_annuelle) : '—'}
      </td>
      <td className="py-3">
        <ActionCell address={address} onAdd={onAdd} />
      </td>
    </tr>
  );
}

function RowParticulier({
  rank,
  address,
  onAdd,
}: {
  rank: number;
  address: ScannedAddress;
  onAdd: () => void;
}) {
  const fin = address.solar
    ? calculerFinancier(
        address.solar.production.kwc,
        address.solar.production.production_annuelle_kwh,
      )
    : null;
  const score = address.solar?.score_solaire ?? null;
  const isTop3 = address.status === 'done' && rank <= 3;

  return (
    <tr
      className="border-b border-border/60 last:border-0"
      style={isTop3 ? { background: '#FEF0E6' } : undefined}
    >
      <td className="py-3 pr-3 align-top">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{
            background: isTop3 ? '#F5821F' : '#F3F4F6',
            color: isTop3 ? '#fff' : '#6B7280',
          }}
        >
          {rank}
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <Thumbnail lat={address.lat} lng={address.lng} />
          <div>
            <div className="font-semibold">{address.label}</div>
            <div className="text-xs text-text-muted">
              {address.postcode} · {address.city}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        {address.solar
          ? `${address.solar.toiture.surface_m2.toFixed(0)} m²`
          : '—'}
      </td>
      <td className="py-3 pr-4">
        {address.solar?.toiture.orientation_principale ?? '—'}
      </td>
      <td className="py-3 pr-4">
        <ScoreCell status={address.status} score={score} />
      </td>
      <td className="py-3 pr-4 font-semibold">
        {fin ? formatEuros(fin.economie_annuelle) : '—'}
      </td>
      <td className="py-3">
        <ActionCell address={address} onAdd={onAdd} />
      </td>
    </tr>
  );
}
