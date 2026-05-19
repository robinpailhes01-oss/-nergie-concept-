'use client';

import { Satellite } from 'lucide-react';
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
  const url = getStaticSatelliteUrl(lat, lng, { zoom });

  if (!url) {
    return (
      <div
        className={`rounded-card flex items-center justify-center text-text-muted text-sm ${className}`}
        style={{
          height,
          background:
            'repeating-linear-gradient(45deg, #F3F4F6, #F3F4F6 8px, #E5E7EB 8px, #E5E7EB 16px)',
        }}
      >
        <div className="text-center">
          <Satellite className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
          <div className="font-semibold">Photo satellite indisponible</div>
          <div className="text-xs mt-0.5">
            Configurer NEXT_PUBLIC_GOOGLE_MAPS_KEY
          </div>
        </div>
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
    />
  );
}
