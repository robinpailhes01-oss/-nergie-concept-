// ============================================================
// GET /api/satellite?lat=...&lng=...&zoom=...&w=...&h=...
// Proxy Google Static Maps :
//   - permet d'embarquer la photo dans le PDF (html2canvas + CORS)
//   - n'expose pas la clé API au client
// ============================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // cache 1h côté CDN Vercel

const KEY =
  process.env.GOOGLE_SOLAR_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

export async function GET(req: Request) {
  if (!KEY) {
    return new NextResponse('No Google key configured', { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  if (!lat || !lng) {
    return new NextResponse('Missing lat/lng', { status: 400 });
  }

  const zoom = searchParams.get('zoom') ?? '20';
  const w = searchParams.get('w') ?? '800';
  const h = searchParams.get('h') ?? '420';
  const marker = searchParams.get('marker') !== '0';

  const upstream = new URL('https://maps.googleapis.com/maps/api/staticmap');
  upstream.searchParams.set('center', `${lat},${lng}`);
  upstream.searchParams.set('zoom', zoom);
  upstream.searchParams.set('size', `${w}x${h}`);
  upstream.searchParams.set('maptype', 'satellite');
  upstream.searchParams.set('scale', '2');
  if (marker) {
    upstream.searchParams.set('markers', `color:0xF5821F|${lat},${lng}`);
  }
  upstream.searchParams.set('key', KEY);

  const r = await fetch(upstream.toString(), { cache: 'force-cache' });
  if (!r.ok) {
    return new NextResponse(`Upstream error: ${r.status}`, { status: 502 });
  }

  const buf = await r.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'content-type': r.headers.get('content-type') ?? 'image/png',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
      'access-control-allow-origin': '*',
    },
  });
}
