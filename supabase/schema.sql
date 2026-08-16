-- Cockpit macro — schéma des données (étape 3).
--
-- Ne contient que des **données** : séries temporelles collectées et santé de la collecte.
-- L'analyse (notes, tendances, scénarios) vit dans `content/`, versionnée dans le dépôt, et
-- ne touche jamais cette base. Le catalogue d'instruments et d'indicateurs reste lui aussi
-- dans `data/seed.json` : c'est de la configuration, pas une série temporelle, et
-- `lib/content.ts` en dépend de façon synchrone au chargement du module.
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : relançable sans dommage.

-- ---------------------------------------------------------------------------
-- Séries temporelles
-- ---------------------------------------------------------------------------

-- Deux tables plutôt qu'une malgré la forme identique : les identifiants d'instruments
-- ('us10y') et d'indicateurs ('us-cpi') sont deux catalogues distincts, et une colonne
-- partagée finirait par laisser passer l'un dans l'autre sans que rien ne le signale.

create table if not exists observations (
  instrument_id text        not null,
  date          date        not null,
  value         double precision not null,
  source        text        not null,
  fetched_at    timestamptz not null default now(),
  -- La clé primaire composite porte à la fois l'unicité — c'est elle qui rend l'insertion
  -- idempotente via `on conflict` — et l'index sur (instrument_id, date). Un second index
  -- sur les mêmes colonnes coûterait à chaque écriture sans rien apporter : Postgres
  -- parcourt un btree dans les deux sens, donc `order by date desc` est déjà servi.
  primary key (instrument_id, date)
);

create table if not exists macro_observations (
  indicator_id  text        not null,
  date          date        not null,
  value         double precision not null,
  source        text        not null,
  fetched_at    timestamptz not null default now(),
  primary key (indicator_id, date)
);

-- ---------------------------------------------------------------------------
-- Métadonnées des indicateurs macro
-- ---------------------------------------------------------------------------

-- Projection de `data/seed.json` + `config/fred-series.ts`, réécrite à chaque passage du
-- cron. La configuration reste la source de vérité : il n'y a jamais rien à maintenir à la
-- main ici, et une divergence se corrige toute seule au passage suivant.

create table if not exists macro_indicators (
  id           text primary key,
  label        text not null,
  zone         text not null,
  unit         text not null,
  frequency    text not null,
  series_key   text,
  next_release date,
  synced_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Santé de la collecte
-- ---------------------------------------------------------------------------

-- Ce qui permet de nommer la source en cause (état 5 du cahier) et de distinguer « FRED n'a
-- pas répondu » de « FRED a répondu, il n'y a simplement rien de neuf ».

create table if not exists series_health (
  series_key           text primary key,   -- l'identifiant chez la source, ex. 'DGS10'
  source               text not null,      -- 'FRED'
  target_kind          text not null check (target_kind in ('instrument', 'macro')),
  target_id            text not null,
  last_attempt_at      timestamptz,
  last_success_at      timestamptz,
  last_error           text,
  consecutive_failures integer not null default 0,
  -- La date de la dernière observation connue, pour le retard de publication — un signal
  -- distinct de la fraîcheur, qui ne doit jamais faire rougir le point de la barre.
  latest_observation   date,
  updated_at           timestamptz not null default now()
);

create index if not exists series_health_source_idx on series_health (source);

-- ---------------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------------

-- Lecture ouverte à la clé anonyme, aucune écriture. Le cron écrit avec la clé de service,
-- côté serveur uniquement — elle n'est jamais exposée au navigateur.

alter table observations       enable row level security;
alter table macro_observations enable row level security;
alter table macro_indicators   enable row level security;
alter table series_health      enable row level security;

drop policy if exists observations_read       on observations;
drop policy if exists macro_observations_read on macro_observations;
drop policy if exists macro_indicators_read   on macro_indicators;
drop policy if exists series_health_read      on series_health;

create policy observations_read       on observations       for select using (true);
create policy macro_observations_read on macro_observations for select using (true);
create policy macro_indicators_read   on macro_indicators   for select using (true);
create policy series_health_read      on series_health      for select using (true);
