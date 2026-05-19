'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Sun, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatEuros, formatNumber, calculerFinancier } from '@/lib/financial';
import type { SolarApiResponse } from '@/types';

export function AnalyseWidget() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SolarApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch(
        `/api/solar?address=${encodeURIComponent(address)}`,
      );
      if (!r.ok) throw new Error('Erreur API');
      const json = (await r.json()) as SolarApiResponse;
      setData(json);
    } catch {
      setError('Analyse impossible. Réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void submit();
  };

  const fin = data
    ? calculerFinancier(data.production.kwc, data.production.production_annuelle_kwh)
    : null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Sun className="w-4 h-4" style={{ color: '#F5821F' }} />
        <h3 className="font-display text-lg font-bold">Analyse rapide</h3>
      </div>
      <p className="text-sm text-text-muted mb-4">
        Estimez le potentiel solaire d'une adresse en quelques secondes.
      </p>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={onKey}
            placeholder="14 rue de la Loge, Montpellier"
            className="input pl-9"
          />
        </div>
        <Button onClick={submit} loading={loading}>
          {!loading && <Search className="w-4 h-4" />} Analyser
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {data && fin && (
        <div className="animate-fadeInUp mt-2">
          {data.demo && (
            <div className="text-[11px] uppercase tracking-wide mb-3 inline-flex items-center px-2 py-0.5 rounded-md font-semibold"
              style={{ background: '#FEF3C7', color: '#92400E' }}>
              Mode démo (sans clé Google)
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Mini label="Surface" value={`${data.toiture.surface_m2.toFixed(0)} m²`} />
            <Mini label="Score solaire" value={`${data.score_solaire}/100`} />
            <Mini label="Production" value={`${formatNumber(data.production.production_annuelle_kwh)} kWh`} />
          </div>
          <div
            className="rounded-card p-4 mb-3"
            style={{ background: 'linear-gradient(135deg, #FEF0E6 0%, #fff 100%)', border: '1px solid #FCD7B4' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold tracking-wide" style={{ color: '#D96B0A' }}>
                  Recommandation
                </div>
                <div className="font-display text-2xl font-bold mt-1">
                  {data.production.kwc} kWc · {data.production.nb_panneaux} panneaux
                </div>
              </div>
              <Zap className="w-8 h-8" style={{ color: '#F5821F' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Mini label="Économie / an" value={formatEuros(fin.economie_annuelle)} accent="teal" />
            <Mini label="Retour invest." value={`${fin.temps_retour_ans} ans`} accent="teal" />
          </div>
          <Link
            href={`/analyse?address=${encodeURIComponent(address)}`}
            className="btn btn-primary w-full"
          >
            <TrendingUp className="w-4 h-4" /> Analyse détaillée
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: 'teal' }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: '#F8F9FC' }}>
      <div className="text-[11px] uppercase tracking-wide text-text-muted font-semibold">
        {label}
      </div>
      <div
        className="font-display text-base font-bold mt-0.5"
        style={{ color: accent === 'teal' ? '#0D7C66' : '#1F2937' }}
      >
        {value}
      </div>
    </div>
  );
}
