# Énergies Concept — Dashboard Prospection Solaire

## Contexte business

Application Next.js de prospection solaire pour **Énergies Concept**,
installateur de panneaux solaires basé à Montpellier (Hérault, 34).

Le commercial saisit une adresse → l'app interroge Google Solar API →
récupère les données toiture (surface, ensoleillement, orientation) →
calcule la rentabilité financière avec les tarifs réglementaires
français 2026 → génère une proposition HTML envoyable au prospect →
suit le pipeline commercial (nouveau → proposition → visite → signé).

## Stack technique

- **Next.js 14** App Router + **TypeScript strict** (zéro `any`)
- **Tailwind CSS** + CSS variables (pas de bibliothèque UI tierce)
- **Recharts** pour les graphiques
- **Lucide React** pour les icônes
- **Supabase** (Postgres + API REST) pour le stockage
- **jsPDF** pour l'export PDF côté client
- **Google Maps Geocoding + Solar API** (avec mode démo si absent)
- Déployé sur **Vercel**

## Identité visuelle

```
--orange:        #F5821F
--orange-dark:   #D96B0A
--orange-light:  #FEF0E6
--teal:          #0D7C66
--sidebar:       #0F1923
--background:    #F8F9FC
--text:          #1F2937
--text-muted:    #6B7280
--border:        #E5E7EB
```

- Fonts : **Outfit 700** (titres) + **Plus Jakarta Sans 400/500/600** (body)
- Sidebar fixe sombre 240px
- Cards blanches `border-radius: 16px`
- Boutons primaires : gradient orange
- Animations `fadeInUp` staggered (50ms entre éléments)

## Règles de développement

1. **TypeScript strict** : pas de `any`, pas de `@ts-ignore`
2. **Mode démo obligatoire** : l'app doit fonctionner sans clé API
   (fallback données mockées Montpellier réalistes)
3. **Responsive** desktop d'abord, breakpoint mobile 768px
4. **Server components par défaut**, `'use client'` uniquement
   quand nécessaire (interactivité, hooks)
5. **Pas de commentaires inutiles** dans le code

## Calculs financiers — référence 2026

- Prix kWh EDF : `0.2516 €`
- Rachat surplus ≤ 3 kWc : `0.1362 €/kWh`
- Rachat surplus > 3 kWc : `0.1155 €/kWh`
- Prime autoconsommation ≤ 3 kWc : `230 €/kWc/an × 5 ans`
- TVA : `10%` pour ≤ 3 kWc, `20%` au-dessus
- Dégradation panneaux : `0.5%/an`
- Hausse tarif électricité : `3%/an` (projection 25 ans)
- CO2 électricité France : `0.0571 kg/kWh`
- Conso moyenne foyer : `4500 kWh/an`

## Structure des fichiers

```
app/                  # Next.js App Router
  api/                # API routes (solar, prospects, proposition)
  page.tsx            # Dashboard
  analyse/            # Analyse adresse
  prospects/          # Liste pipeline
  proposition/[id]/   # Page publique shareable
components/
  layout/             # Sidebar
  ui/                 # StatCard, Badge, Button, Modal
  dashboard/          # Charts + widgets
lib/
  supabase.ts         # Client Supabase
  financial.ts        # Calculs France 2026
  proposition.ts      # Générateur HTML proposition
types/index.ts        # Types globaux
supabase/schema.sql   # Schéma + données démo
```

## Commandes

```bash
npm install
npm run dev           # Dev sur :3000
npm run build         # Build production
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

## Variables d'environnement

Voir `.env.example`. Toutes optionnelles — l'app fonctionne en mode démo
si elles sont absentes.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_SOLAR_API_KEY=             # serveur (Solar + Geocoding)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=      # client (Static Maps satellite)
```
