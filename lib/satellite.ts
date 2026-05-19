// ============================================================
// Photos satellite via Google Static Maps API
// Une seule clé partagée client/serveur (NEXT_PUBLIC_GOOGLE_MAPS_KEY)
// avec restriction par référents HTTP côté console Google.
// ============================================================

interface StaticMapOpts {
  width?: number;
  height?: number;
  zoom?: number;
  marker?: boolean;
}

function resolveKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ??
    process.env.GOOGLE_SOLAR_API_KEY
  );
}

export function getStaticSatelliteUrl(
  lat: number | null | undefined,
  lng: number | null | undefined,
  opts: StaticMapOpts = {},
): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  const key = resolveKey();
  if (!key) return null;

  const { width = 640, height = 360, zoom = 20, marker = true } = opts;

  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${lat},${lng}`);
  url.searchParams.set('zoom', String(zoom));
  url.searchParams.set('size', `${width}x${height}`);
  url.searchParams.set('maptype', 'satellite');
  url.searchParams.set('scale', '2');
  if (marker) {
    url.searchParams.set('markers', `color:0xF5821F|${lat},${lng}`);
  }
  url.searchParams.set('key', key);
  return url.toString();
}

export const hasSatelliteKey = (): boolean => Boolean(resolveKey());

// ============================================================
// URL proxifiée — same-origin, utilisable dans la proposition HTML
// (compatible html2canvas / PDF). N'expose pas la clé API.
// ============================================================

export function getProxiedSatelliteUrl(
  lat: number | null | undefined,
  lng: number | null | undefined,
  opts: StaticMapOpts = {},
): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  if (!resolveKey()) return null;

  const { width = 800, height = 420, zoom = 20, marker = true } = opts;
  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
    w: String(width),
    h: String(height),
    marker: marker ? '1' : '0',
  });
  return `/api/satellite?${qs.toString()}`;
}
