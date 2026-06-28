'use client';

import { useState } from 'react';
import { Satellite, ExternalLink } from 'lucide-react';
import { getStaticSatelliteUrl } from '@/lib/satellite';

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
  alt?: string;
  className?: string;
  height?: number;
  zoom?: number;
}

export function SatellitePhoto({
  lat,
  lng,
  alt = 'Vue satellite du bâtiment',
  className = '',
  height = 280,
  zoom = 20,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const url = getStaticSatelliteUrl(lat, lng, { zoom });
  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/@${lat},${lng},19z/data=!3m1!1e3`
      : null;

  if (!url || imgError) {
    return (
      <div
        className={`rounded-card flex flex-col items-center justify-center text-text-muted text-sm gap-3 ${className}`}
        style={{
          height,
          background:
            'repeating-linear-gradient(45deg, #F3F4F6, #F3F4F6 8px, #E5E7EB 8px, #E5E7EB 16px)',
        }}
      >
        <div className="text-center">
          <Satellite className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
          <div className="font-semibold text-sm">Photo satellite</div>
          <div className="text-xs mt-0.5 text-text-muted">
            {imgError
              ? 'Maps Static API non activée'
              : 'Clé NEXT_PUBLIC_GOOGLE_MAPS_KEY manquante'}
          </div>
        </div>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: '#DBEAFE', color: '#1D4ED8' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir sur Google Maps (satellite)
          </a>
        )}
        {imgError && (
          <p className="text-[10px] text-text-muted text-center px-4">
            Active <strong>Maps Static API</strong> dans Google Cloud Console
            pour les photos intégrées.
          </p>
        )}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      className={`rounded-card object-cover w-full ${className}`}
      style={{ height }}
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
}
