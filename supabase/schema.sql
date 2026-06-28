-- ============================================================
-- Énergies Concept — Dashboard prospection solaire
-- Schéma Postgres / Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- Enum statut commercial
do $$ begin
  create type prospect_statut as enum (
    'nouveau',
    'proposition_envoyee',
    'visite_planifiee',
    'signe',
    'perdu'
  );
exception when duplicate_object then null; end $$;

-- ============================================================
-- Table prospects
-- ============================================================
create table if not exists public.prospects (
  -- Identité
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Contact
  nom             text not null,
  prenom          text not null,
  email           text,
  telephone       text,

  -- Localisation
  adresse         text not null,
  ville           text not null,
  code_postal     text,
  latitude        double precision,
  longitude       double precision,

  -- Toiture (Google Solar)
  surface_toit_m2          double precision,
  nb_panneaux_recommande   integer,
  production_annuelle_kwh  double precision,
  heures_ensoleillement    double precision,
  orientation_principale   text,
  score_solaire            integer,
  qualite_imagerie         text,
  panneaux_detectes        text,
  date_photo_satellite     text,

  -- Financier
  puissance_kwc        double precision,
  cout_installation_ttc double precision,
  aides_totales        double precision,
  reste_a_charge       double precision,
  economie_annuelle    double precision,
  temps_retour_ans     double precision,
  co2_evite_kg_an      double precision,

  -- Commercial
  statut             prospect_statut not null default 'nouveau',
  notes              text,
  proposition_id     text unique,
  proposition_html   text,
  proposition_vue_at timestamptz
);

-- Indexes
create index if not exists idx_prospects_statut     on public.prospects(statut);
create index if not exists idx_prospects_created_at on public.prospects(created_at desc);
create index if not exists idx_prospects_ville      on public.prospects(ville);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_prospects_updated_at on public.prospects;
create trigger trg_prospects_updated_at
  before update on public.prospects
  for each row execute function public.set_updated_at();

-- ============================================================
-- Vue dashboard_stats
-- ============================================================
create or replace view public.dashboard_stats as
select
  count(*)::int                                                              as total_prospects,
  count(*) filter (where production_annuelle_kwh is not null)::int           as total_analyses,
  count(*) filter (where statut = 'proposition_envoyee')::int                as total_propositions,
  count(*) filter (where statut = 'signe')::int                              as total_signes,
  coalesce(sum(cout_installation_ttc) filter (
    where statut in ('proposition_envoyee', 'visite_planifiee')
  ), 0)::numeric(12,2)                                                       as ca_pipeline,
  coalesce(sum(cout_installation_ttc) filter (where statut = 'signe'), 0)::numeric(12,2)
                                                                             as ca_signe,
  coalesce(avg(temps_retour_ans), 0)::numeric(4,1)                           as roi_moyen_ans
from public.prospects;

-- ============================================================
-- RLS (lecture publique des propositions par proposition_id)
-- ============================================================
alter table public.prospects enable row level security;

drop policy if exists prospects_service_all on public.prospects;
create policy prospects_service_all on public.prospects
  for all using (true) with check (true);

-- ============================================================
-- Données démo
-- ============================================================
insert into public.prospects (
  nom, prenom, email, telephone,
  adresse, ville, code_postal, latitude, longitude,
  surface_toit_m2, nb_panneaux_recommande, production_annuelle_kwh,
  heures_ensoleillement, orientation_principale, score_solaire, qualite_imagerie,
  puissance_kwc, cout_installation_ttc, aides_totales, reste_a_charge,
  economie_annuelle, temps_retour_ans, co2_evite_kg_an,
  statut, notes, proposition_id, created_at
) values
(
  'Dubois', 'Marie', 'marie.dubois@example.fr', '06 12 34 56 78',
  '14 rue de la Loge', 'Montpellier', '34000', 43.6108, 3.8767,
  78.5, 12, 4850,
  2680, 'Sud', 92, 'HIGH',
  4.86, 11900, 1150, 10750,
  1380, 7.8, 277,
  'proposition_envoyee', 'Maison individuelle 110m², toiture 4 pans. Très chaud.',
  'prop_demo_001', now() - interval '2 days'
),
(
  'Martin', 'Jean-Pierre', 'jp.martin@example.fr', '06 23 45 67 89',
  '7 quai de la Marine', 'Sète', '34200', 43.4053, 3.6939,
  62.0, 10, 3950,
  2720, 'Sud-Ouest', 87, 'HIGH',
  4.05, 9800, 950, 8850,
  1140, 7.8, 226,
  'visite_planifiee', 'Visite technique RDV mardi 10h. Toiture exposée sud-ouest sans masque.',
  'prop_demo_002', now() - interval '5 days'
),
(
  'Bernard', 'Sophie', 'sophie.bernard@example.fr', '06 34 56 78 90',
  '23 avenue de la Mer', 'Lunel', '34400', 43.6776, 4.1370,
  95.0, 14, 5680,
  2640, 'Sud', 95, 'HIGH',
  5.67, 13800, 0, 13800,
  1610, 8.6, 324,
  'signe', 'Contrat signé. Installation prévue semaine 28. Prime EDF OA validée.',
  'prop_demo_003', now() - interval '12 days'
),
(
  'Lefebvre', 'Thomas', 'thomas.lefebvre@example.fr', '06 45 67 89 01',
  '5 boulevard du Maréchal Joffre', 'Palavas-les-Flots', '34250', 43.5283, 3.9311,
  54.0, 9, 3520,
  2700, 'Sud-Est', 81, 'MEDIUM',
  3.65, 8900, 805, 8095,
  1010, 8.0, 201,
  'nouveau', 'Premier contact via formulaire site. À rappeler.',
  'prop_demo_004', now() - interval '1 day'
),
(
  'Garcia', 'Isabelle', 'isabelle.garcia@example.fr', '06 56 78 90 12',
  '18 rue Émile Jamais', 'Nîmes', '30000', 43.8367, 4.3601,
  88.0, 13, 5200,
  2580, 'Sud', 89, 'HIGH',
  5.26, 12750, 0, 12750,
  1480, 8.6, 297,
  'perdu', 'Prospect a choisi un concurrent (prix). Garder en base pour relance 2027.',
  'prop_demo_005', now() - interval '20 days'
)
on conflict do nothing;
