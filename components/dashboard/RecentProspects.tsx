import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { StatutBadge } from '@/components/ui/Badge';
import { formatEuros } from '@/lib/financial';
import { getStaticSatelliteUrl } from '@/lib/satellite';
import type { Prospect } from '@/types';

interface Props {
  prospects: Prospect[];
}

export function RecentProspects({ prospects }: Props) {
  const recent = prospects.slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold">Derniers prospects</h3>
          <p className="text-sm text-text-muted mt-0.5">
            5 entrées les plus récentes
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

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border">
              <th className="pb-3 pr-4">Prospect</th>
              <th className="pb-3 pr-4">Ville</th>
              <th className="pb-3 pr-4">Montant</th>
              <th className="pb-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-text-muted">
                  Aucun prospect pour le moment.
                </td>
              </tr>
            )}
            {recent.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border/60 last:border-0 hover:bg-background/60 transition-colors"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <ProspectThumb lat={p.latitude} lng={p.longitude} />
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
                <td className="py-3 pr-4 font-semibold">
                  {p.cout_installation_ttc
                    ? formatEuros(p.cout_installation_ttc)
                    : '—'}
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
  );
}

function ProspectThumb({
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
        className="w-10 h-10 rounded-lg shrink-0"
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
      className="w-10 h-10 rounded-lg object-cover shrink-0"
      loading="lazy"
    />
  );
}
