// ============================================================
// GET /api/solar?address=...
// Pipeline : Geocoding → Solar API buildingInsights → normalisation
// Mode démo automatique si GOOGLE_SOLAR_API_KEY absent.
// ============================================================

import { NextResponse } from 'next/server';
import type {
  DetectionPanneaux,
  Orientation,
  ProductionScenario,
  QualiteImagerie,
  SolarApiResponse,
} from '@/types';
import {
  calculerScoreSolaire,
  recommanderPuissance,
  CONSO_FOYER_MOYEN_KWH,
} from '@/lib/financial';
import { getStaticSatelliteUrl } from '@/lib/satellite';

export const dynamic = 'force-dynamic';

const GOOGLE_KEY = process.env.GOOGLE_SOLAR_API_KEY;
const PUISSANCE_PANNEAU_WC = 425;

// ============================================================
// Mode démo (sans clé Google)
// ============================================================

interface DemoFixture {
  match: RegExp;
  data: Omit<SolarApiResponse, 'demo'>;
}

const DEMO_FIXTURES: DemoFixture[] = [
  {
    match: /sète|sete/i,
    data: buildDemo({
      adresse: '7 quai de la Marine',
      ville: 'Sète',
      code_postal: '34200',
      lat: 43.4053,
      lng: 3.6939,
      surface: 62,
      heures: 2720,
      orientation: 'Sud-Ouest',
      detection: 'oui',
      detectionDate: 'mai 2024',
    }),
  },
  {
    match: /lunel/i,
    data: buildDemo({
      adresse: '23 avenue de la Mer',
      ville: 'Lunel',
      code_postal: '34400',
      lat: 43.6776,
      lng: 4.137,
      surface: 95,
      heures: 2640,
      orientation: 'Sud',
      detection: 'non',
      detectionDate: 'mars 2024',
    }),
  },
  {
    match: /nîmes|nimes/i,
    data: buildDemo({
      adresse: '18 rue Émile Jamais',
      ville: 'Nîmes',
      code_postal: '30000',
      lat: 43.8367,
      lng: 4.3601,
      surface: 88,
      heures: 2580,
      orientation: 'Sud',
      detection: 'non',
      detectionDate: 'juin 2024',
    }),
  },
  {
    match: /palavas/i,
    data: buildDemo({
      adresse: '5 boulevard du Maréchal Joffre',
      ville: 'Palavas-les-Flots',
      code_postal: '34250',
      lat: 43.5283,
      lng: 3.9311,
      surface: 54,
      heures: 2700,
      orientation: 'Sud-Est',
      detection: 'non',
      detectionDate: 'avril 2024',
    }),
  },
];

const DEFAULT_DEMO = buildDemo({
  adresse: '14 rue de la Loge',
  ville: 'Montpellier',
  code_postal: '34000',
  lat: 43.6108,
  lng: 3.8767,
  surface: 78.5,
  heures: 2680,
  orientation: 'Sud',
  detection: 'non',
  detectionDate: 'mars 2024',
});

interface DemoInput {
  adresse: string;
  ville: string;
  code_postal: string;
  lat: number;
  lng: number;
  surface: number;
  heures: number;
  orientation: Orientation;
  detection?: DetectionPanneaux;
  detectionDate?: string;
}

function buildDemo(input: DemoInput): Omit<SolarApiResponse, 'demo'> {
  const panneauxMax = Math.floor(input.surface / 1.95);
  const reco = recommanderPuissance(input.surface, panneauxMax);
  const productivite_kwh_par_kwc = (input.heures / 2680) * 1100;
  const production = Math.round(reco.kwc * productivite_kwh_par_kwc);

  const scenarios: ProductionScenario[] = [
    { kwc: 3, nb_panneaux: 7, production_annuelle_kwh: Math.round(3 * productivite_kwh_par_kwc) },
    {
      kwc: reco.kwc,
      nb_panneaux: reco.nb_panneaux,
      production_annuelle_kwh: production,
    },
    { kwc: 6, nb_panneaux: 14, production_annuelle_kwh: Math.round(6 * productivite_kwh_par_kwc) },
  ];

  const qualite: QualiteImagerie = 'HIGH';

  return {
    geocode: {
      adresse: input.adresse,
      ville: input.ville,
      code_postal: input.code_postal,
      latitude: input.lat,
      longitude: input.lng,
    },
    toiture: {
      surface_m2: input.surface,
      nb_panneaux_max: panneauxMax,
      orientation_principale: input.orientation,
      inclinaison_deg: 30,
      heures_ensoleillement: input.heures,
      qualite_imagerie: qualite,
    },
    production: {
      kwc: reco.kwc,
      nb_panneaux: reco.nb_panneaux,
      production_annuelle_kwh: production,
    },
    scenarios,
    qualite,
    score_solaire: calculerScoreSolaire(
      input.heures,
      input.orientation,
      input.surface,
      qualite,
    ),
    photo_satellite_url: getStaticSatelliteUrl(input.lat, input.lng),
    imagery_date: input.detectionDate ?? null,
    panneaux_detectes: input.detection ?? 'inconnu',
    detection_date: input.detectionDate ?? null,
  };
}

function pickDemo(address: string): SolarApiResponse {
  const match = DEMO_FIXTURES.find((f) => f.match.test(address));
  const base = match ? match.data : DEFAULT_DEMO;
  return { demo: true, ...base };
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatImageryDate(
  d?: { year?: number; month?: number; day?: number },
): string | null {
  if (!d?.year) return null;
  const mois = d.month && d.month >= 1 && d.month <= 12
    ? `${MOIS_FR[d.month - 1]} `
    : '';
  return `${mois}${d.year}`;
}

// ============================================================
// Pipeline Google (Geocoding + Solar)
// ============================================================

interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

interface RoofSegment {
  pitchDegrees?: number;
  azimuthDegrees?: number;
  stats?: { areaMeters2?: number };
}

interface BuildingInsightsResponse {
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  imageryDate?: { year?: number; month?: number; day?: number };
  detectedArrays?: {
    detectionStatus?: string;
    latestCaptureDate?: { year?: number; month?: number; day?: number };
  };
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    panelCapacityWatts?: number;
    roofSegmentStats?: RoofSegment[];
    solarPanelConfigs?: Array<{
      panelsCount: number;
      yearlyEnergyDcKwh: number;
    }>;
  };
}

function mapDetectionStatus(status?: string): DetectionPanneaux {
  switch (status) {
    case 'DETECTION_STATUS_ARRAYS_DETECTED':
      return 'oui';
    case 'DETECTION_STATUS_NO_ARRAYS_DETECTED':
      return 'non';
    default:
      return 'inconnu';
  }
}

function azimuthToOrientation(az: number): Orientation {
  const a = ((az % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return 'Nord';
  if (a < 67.5) return 'Nord-Est';
  if (a < 112.5) return 'Est';
  if (a < 157.5) return 'Sud-Est';
  if (a < 202.5) return 'Sud';
  if (a < 247.5) return 'Sud-Ouest';
  if (a < 292.5) return 'Ouest';
  return 'Nord-Ouest';
}

async function geocode(address: string): Promise<{
  formatted: string;
  ville: string;
  code_postal: string;
  lat: number;
  lng: number;
} | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'fr');
  url.searchParams.set('key', GOOGLE_KEY as string);
  const r = await fetch(url.toString(), { cache: 'no-store' });
  const j = (await r.json()) as GeocodingResponse;
  if (j.status !== 'OK' || j.results.length === 0) return null;
  const top = j.results[0];
  if (!top) return null;
  const get = (type: string) =>
    top.address_components.find((c) => c.types.includes(type))?.long_name ?? '';
  return {
    formatted: top.formatted_address,
    ville: get('locality') || get('postal_town'),
    code_postal: get('postal_code'),
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
  };
}

async function buildingInsights(
  lat: number,
  lng: number,
): Promise<BuildingInsightsResponse | null> {
  const url = new URL(
    'https://solar.googleapis.com/v1/buildingInsights:findClosest',
  );
  url.searchParams.set('location.latitude', lat.toString());
  url.searchParams.set('location.longitude', lng.toString());
  url.searchParams.set('requiredQuality', 'LOW');
  // Détection IA des panneaux solaires déjà installés sur le toit
  url.searchParams.append('additionalInsights', 'DETECTED_ARRAYS');
  url.searchParams.set('key', GOOGLE_KEY as string);
  const r = await fetch(url.toString(), { cache: 'no-store' });
  if (!r.ok) return null;
  return (await r.json()) as BuildingInsightsResponse;
}

function selectConfig(insights: BuildingInsightsResponse): {
  kwc: number;
  nb_panneaux: number;
  production_annuelle_kwh: number;
  scenarios: ProductionScenario[];
} | null {
  const sp = insights.solarPotential;
  if (!sp) return null;
  const configs = sp.solarPanelConfigs ?? [];
  if (configs.length === 0) return null;
  const wattsPerPanel = sp.panelCapacityWatts ?? PUISSANCE_PANNEAU_WC;

  // Configuration cible : ~80% conso foyer
  const cible = CONSO_FOYER_MOYEN_KWH * 0.8;
  const chosen = configs.reduce((best, c) => {
    const diff = Math.abs(c.yearlyEnergyDcKwh - cible);
    const bestDiff = Math.abs(best.yearlyEnergyDcKwh - cible);
    return diff < bestDiff ? c : best;
  });

  // 3 scénarios : petit / recommandé / grand
  const sortByDiff = (target: number) =>
    [...configs].sort(
      (a, b) =>
        Math.abs(a.yearlyEnergyDcKwh - target) -
        Math.abs(b.yearlyEnergyDcKwh - target),
    )[0];
  const small = sortByDiff(CONSO_FOYER_MOYEN_KWH * 0.5);
  const big = sortByDiff(CONSO_FOYER_MOYEN_KWH * 1.1);

  const toScenario = (c: {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
  }): ProductionScenario => ({
    kwc: Math.round((c.panelsCount * wattsPerPanel) / 100) / 10,
    nb_panneaux: c.panelsCount,
    production_annuelle_kwh: Math.round(c.yearlyEnergyDcKwh),
  });

  const scenarios: ProductionScenario[] = [];
  if (small) scenarios.push(toScenario(small));
  scenarios.push(toScenario(chosen));
  if (big && big !== chosen) scenarios.push(toScenario(big));

  return {
    kwc: Math.round((chosen.panelsCount * wattsPerPanel) / 100) / 10,
    nb_panneaux: chosen.panelsCount,
    production_annuelle_kwh: Math.round(chosen.yearlyEnergyDcKwh),
    scenarios,
  };
}

// ============================================================
// Route handler
// ============================================================

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address')?.trim();

  if (!address) {
    return NextResponse.json(
      { error: 'Paramètre `address` manquant' },
      { status: 400 },
    );
  }

  if (!GOOGLE_KEY) {
    return NextResponse.json(pickDemo(address));
  }

  try {
    const geo = await geocode(address);
    if (!geo) return NextResponse.json(pickDemo(address));

    const insights = await buildingInsights(geo.lat, geo.lng);
    if (!insights?.solarPotential) {
      return NextResponse.json(pickDemo(address));
    }

    const config = selectConfig(insights);
    if (!config) return NextResponse.json(pickDemo(address));

    const sp = insights.solarPotential;
    const surface = sp.maxArrayAreaMeters2 ?? 60;
    const heures = sp.maxSunshineHoursPerYear ?? 2400;
    const qualite: QualiteImagerie = insights.imageryQuality ?? 'MEDIUM';

    // Orientation principale = segment au plus grand area, sud-favorisé
    const segs = sp.roofSegmentStats ?? [];
    const biggest = segs
      .filter((s) => s.azimuthDegrees !== undefined)
      .sort((a, b) => (b.stats?.areaMeters2 ?? 0) - (a.stats?.areaMeters2 ?? 0))[0];
    const orientation: Orientation = biggest?.azimuthDegrees !== undefined
      ? azimuthToOrientation(biggest.azimuthDegrees)
      : 'Sud';
    const inclinaison = biggest?.pitchDegrees ?? 30;

    const response: SolarApiResponse = {
      demo: false,
      geocode: {
        adresse: geo.formatted,
        ville: geo.ville,
        code_postal: geo.code_postal,
        latitude: geo.lat,
        longitude: geo.lng,
      },
      toiture: {
        surface_m2: Math.round(surface * 10) / 10,
        nb_panneaux_max: sp.maxArrayPanelsCount ?? config.nb_panneaux,
        orientation_principale: orientation,
        inclinaison_deg: Math.round(inclinaison),
        heures_ensoleillement: Math.round(heures),
        qualite_imagerie: qualite,
      },
      production: {
        kwc: config.kwc,
        nb_panneaux: config.nb_panneaux,
        production_annuelle_kwh: config.production_annuelle_kwh,
      },
      scenarios: config.scenarios,
      qualite,
      score_solaire: calculerScoreSolaire(heures, orientation, surface, qualite),
      photo_satellite_url: getStaticSatelliteUrl(geo.lat, geo.lng),
      imagery_date: formatImageryDate(insights.imageryDate),
      panneaux_detectes: mapDetectionStatus(
        insights.detectedArrays?.detectionStatus,
      ),
      detection_date:
        formatImageryDate(insights.detectedArrays?.latestCaptureDate) ??
        formatImageryDate(insights.imageryDate),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(pickDemo(address));
  }
}
