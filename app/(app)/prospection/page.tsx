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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  calculerFinancier,
  formatEuros,
  formatNumber,
} from '@/lib/financial';
import { getStaticSatelliteUrl } from '@/lib/satellite';
import type { Prospect, SolarApiResponse } from '@/types';

interface ScannedAddress {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  status: 'pending' | 'loading' | 'done' | 'error';
  solar?: SolarApiResponse;
  prospect_id?: string;
}

interface FoundStreet {
  street: string;
  city: string;
  postcode: string;
}

const PARALLEL_WORKERS = 3;

export default function ProspectionPage() {
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
      if (!r.ok) {
        setError('error' in json ? json.error : 'Erreur');
        return;
      }
      if ('addresses' in json) {
        if (json.addresses.length === 0) {
          setError(
            'Aucune adresse trouvée dans le Gard ou l\'Hérault pour cette recherche.',
          );
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
      }
    } catch {
      setError('Recherche impossible. Vérifie ta connexion.');
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

    async function worker() {
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

  async function addToPipeline(addr: ScannedAddress, indexInList: number) {
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
    const r = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return;
    const j = (await r.json()) as { prospect: Prospect };
    setAddresses((all) => {
      const copy = [...all];
      if (copy[indexInList]) {
        copy[indexInList] = {
          ...copy[indexInList]!,
          prospect_id: j.prospect.id,
        };
      }
      return copy;
    });
  }

  const sorted = [...addresses]
    .map((a, originalIdx) => ({ a, originalIdx }))
    .sort((x, y) => {
      const xs = x.a.solar?.score_solaire ?? -1;
      const ys = y.a.solar?.score_solaire ?? -1;
      return ys - xs;
    });

  const doneCount = addresses.filter((a) => a.status === 'done').length;
  const allDone = addresses.length > 0 && doneCount === addresses.length;
  const coutEstime = addresses.length * 0.05;

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
          Scanne une rue ou un quartier dans le Gard (30) ou l'Hérault (34).
          L'app interroge la Base Adresse Nationale puis Google Solar API pour
          classer les meilleurs toits.
        </p>
      </header>

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
          💡 Astuce : tape une rue + une commune pour avoir les bons numéros
          (ex : « avenue de la Liberté, Lattes »). Filtres automatiques :
          départements 30 et 34 uniquement.
        </p>
      </div>

      {error && (
        <div
          className="card mb-4 flex items-start gap-3"
          style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {addresses.length > 0 && (
        <>
          <div className="card mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">
                  {addresses.length} adresse{addresses.length > 1 ? 's' : ''} trouvée
                  {addresses.length > 1 ? 's' : ''}
                  {foundStreet && (
                    <span className="text-text-muted font-normal text-base">
                      {' '}— {foundStreet.street}, {foundStreet.city}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-text-muted">
                  Coût Google Solar estimé : ~{formatEuros(coutEstime)} ·
                  Scan en parallèle ({PARALLEL_WORKERS} workers)
                </p>
              </div>
              <Button
                variant="primary"
                onClick={scan}
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
            {(scanning || allDone) && (
              <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${addresses.length === 0 ? 0 : (doneCount / addresses.length) * 100}%`,
                    background: 'linear-gradient(90deg, #F5821F, #D96B0A)',
                  }}
                />
              </div>
            )}
          </div>

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
                    <Row
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
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Row({
  rank,
  address,
  onAdd,
}: {
  rank: number;
  address: ScannedAddress;
  onAdd: () => void;
}) {
  const thumb = getStaticSatelliteUrl(address.lat, address.lng, {
    width: 96,
    height: 96,
    zoom: 19,
    marker: false,
  });

  const fin = address.solar
    ? calculerFinancier(
        address.solar.production.kwc,
        address.solar.production.production_annuelle_kwh,
      )
    : null;

  const score = address.solar?.score_solaire ?? null;
  const scoreColor =
    score === null
      ? '#9CA3AF'
      : score >= 85
        ? '#0D7C66'
        : score >= 70
          ? '#F5821F'
          : '#9CA3AF';

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
          {thumb ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumb}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
              loading="lazy"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, #FEF0E6 0%, #FCD7B4 100%)',
              }}
            />
          )}
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
        {address.status === 'loading' && (
          <span className="inline-flex items-center gap-1.5 text-text-muted">
            <span className="spinner spinner-dark" /> scan…
          </span>
        )}
        {address.status === 'pending' && (
          <span className="text-text-muted">—</span>
        )}
        {address.status === 'error' && (
          <span className="text-red-600 text-xs">échec</span>
        )}
        {score !== null && (
          <span
            className="font-display text-lg font-bold"
            style={{ color: scoreColor }}
          >
            {score}
            <span className="text-xs text-text-muted">/100</span>
          </span>
        )}
      </td>
      <td className="py-3 pr-4 font-semibold">
        {fin ? formatEuros(fin.economie_annuelle) : '—'}
      </td>
      <td className="py-3">
        {address.prospect_id ? (
          <Link
            href={`/prospects`}
            className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-semibold"
          >
            <Check className="w-4 h-4" /> Ajouté
          </Link>
        ) : address.solar ? (
          <button
            type="button"
            onClick={onAdd}
            className="btn btn-ghost py-1.5 px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Pipeline
          </button>
        ) : (
          <Link
            href={`/analyse?address=${encodeURIComponent(address.label)}`}
            className="text-xs text-text-muted hover:text-orange inline-flex items-center gap-1"
          >
            Analyser <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </td>
    </tr>
  );
}
