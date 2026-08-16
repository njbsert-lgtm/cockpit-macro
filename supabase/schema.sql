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
-- Veille
-- ---------------------------------------------------------------------------

-- Liens et métadonnées, jamais le texte intégral d'un article (droit d'auteur, cahier des
-- charges). `id` est un hash stable de (source, url) : un même article revu deux jours de
-- suite s'upserte sur lui-même plutôt que de dupliquer la ligne.
--
-- `driver_refs` et `channels` sont posés par la passe 1, déterministe (mots-clés, pas de
-- jugement) : un item qui n'en porte aucun n'est jamais écrit ici, il est écarté avant.

create table if not exists veille_items (
  id                text primary key,
  title             text not null,
  url               text not null,
  source            text not null,
  published_at      timestamptz not null,
  zones             text[] not null default '{}',
  driver_refs       text[] not null default '{}',
  channels          text[] not null default '{}',
  is_signal         boolean not null default true,
  status            text not null default 'nouveau'
                      check (status in ('nouveau', 'verse', 'archive', 'ignore')),
  attached_to_block text,
  draft_note_slug   text,
  collected_at      timestamptz not null default now()
);

create index if not exists veille_items_status_idx on veille_items (status, published_at desc);

-- L'état d'avancement d'une collecte qui déborde le budget de temps d'un seul passage — GDELT
-- interroge (thème × pays) une combinaison à la fois ; si le passage du jour s'arrête à mi-
-- parcours, celui de demain reprend à la combinaison suivante plutôt que de tout refaire ou de
-- rater le reste indéfiniment.

create table if not exists veille_cursor (
  source     text primary key,   -- 'GDELT'
  position   integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Santé de la collecte de veille — la même idée que `series_health`, mais dans une table à
-- part, jamais lue par `lib/freshness-summary.ts`. C'est cette séparation, et non un simple
-- champ `source` distinct, qui garantit qu'un échec de veille ne peut pas se lire comme un
-- échec FRED dans l'indicateur de fraîcheur de la barre persistante : les deux vivent dans des
-- tables différentes, l'une publique, l'autre non.

create table if not exists veille_health (
  collector             text primary key,   -- 'GDELT' | 'institutional' | 'EDGAR'
  last_attempt_at       timestamptz,
  last_success_at       timestamptz,
  last_error            text,
  consecutive_failures  integer not null default 0,
  items_written         integer not null default 0,
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sécurité
-- ---------------------------------------------------------------------------

-- Lecture ouverte à la clé anonyme, aucune écriture. Le cron écrit avec la clé de service,
-- côté serveur uniquement — elle n'est jamais exposée au navigateur.

alter table observations       enable row level security;
alter table macro_observations enable row level security;
alter table macro_indicators   enable row level security;
alter table series_health      enable row level security;
alter table veille_items       enable row level security;
alter table veille_cursor      enable row level security;
alter table veille_health      enable row level security;

drop policy if exists observations_read       on observations;
drop policy if exists macro_observations_read on macro_observations;
drop policy if exists macro_indicators_read   on macro_indicators;
drop policy if exists series_health_read      on series_health;
drop policy if exists veille_items_read       on veille_items;

create policy observations_read       on observations       for select using (true);
create policy macro_observations_read on macro_observations for select using (true);
create policy macro_indicators_read   on macro_indicators   for select using (true);
create policy series_health_read      on series_health      for select using (true);
-- `/triage` lit les items par la clé anonyme ; les trois actions (verser, archiver, ignorer)
-- écrivent par Server Action, avec la clé de service, jamais depuis le navigateur.
create policy veille_items_read       on veille_items       for select using (true);
-- veille_cursor et veille_health n'ont pas de politique de lecture : ce sont des détails
-- d'implémentation de la collecte, jamais affichés, seule la clé de service y touche. C'est ce
-- qui empêche `veille_health` de fuiter dans l'indicateur de fraîcheur de la barre persistante,
-- qui lit `series_health` par la clé anonyme.
