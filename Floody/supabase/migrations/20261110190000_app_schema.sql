-- Floody 2.1: private data schema.
-- Follows docs/floody-2.1/ARCHITECTURE.md §2. Clients never touch these tables: all access goes
-- through SECURITY DEFINER functions in `public` (see the next migration).

create extension if not exists postgis with schema extensions;

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
alter default privileges in schema app revoke all on tables from public, anon, authenticated;
alter default privileges in schema app revoke all on sequences from public, anon, authenticated;
alter default privileges in schema app revoke execute on functions from public, anon, authenticated;

-- Configuration changed only by migration in 2.1.
create table app.app_config (
  key text primary key,
  value jsonb not null
);
insert into app.app_config (key, value) values
  ('submit_limit_per_hour', '5'),
  ('submit_limit_per_day', '20'),
  ('public_list_limit', '500'),
  ('review_window_hours', '24'),
  ('rules_version', '1');

-- Versioned service-area boundary. Exactly one row may be active.
create table app.rmr_boundaries (
  id int generated always as identity primary key,
  geom extensions.geometry(MultiPolygon, 4326) not null check (extensions.st_isvalid(geom)),
  source_name text not null,
  source_url text not null,
  source_edition text not null,
  licence text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  municipality_codes text[] not null check (cardinality(municipality_codes) > 0),
  imported_at timestamptz not null default now(),
  is_active boolean not null default false
);
create unique index rmr_boundaries_single_active on app.rmr_boundaries ((true)) where is_active;

create table app.rmr_boundary_parts (
  id bigint generated always as identity primary key,
  boundary_id int not null references app.rmr_boundaries (id) on delete cascade,
  geom extensions.geometry(Polygon, 4326) not null
);
create index rmr_boundary_parts_geom on app.rmr_boundary_parts using gist (geom);
create index rmr_boundary_parts_boundary on app.rmr_boundary_parts (boundary_id);

create table app.reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete set null,
  client_submission_id uuid not null,
  payload_hash bytea not null check (octet_length(payload_hash) = 32),
  hazard_type text not null check (hazard_type in ('flood_impassable', 'pothole', 'roadworks', 'traffic')),
  description text not null check (char_length(description) between 1 and 2000),
  location_label text check (location_label is null or char_length(location_label) between 1 and 200),
  location extensions.geometry(Point, 4326) not null,
  location_source text not null check (location_source in ('gps', 'manual')),
  gps_accuracy_m real check (gps_accuracy_m is null or (gps_accuracy_m >= 0 and gps_accuracy_m <= 100000)),
  boundary_id int not null references app.rmr_boundaries (id),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  status text not null check (status in ('held', 'published', 'hidden', 'rejected', 'withdrawn', 'expired')),
  hold_reasons text[] not null default '{}',
  rules_version smallint not null,
  review_deadline_at timestamptz not null,
  first_published_at timestamptz,
  expires_at timestamptz,
  auto_hide_exempt boolean not null default false,
  closed_at timestamptz,
  purge_after timestamptz,
  author_deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint reports_author_submission_unique unique (author_id, client_submission_id),
  constraint reports_observation_window check (
    observed_at >= received_at - interval '6 hours' and observed_at <= received_at + interval '2 minutes'),
  constraint reports_publication_pair check ((first_published_at is null) = (expires_at is null)),
  constraint reports_lifetime_48h check (expires_at is null or expires_at = first_published_at + interval '48 hours'),
  constraint reports_published_has_lifetime check (status not in ('published', 'hidden') or first_published_at is not null),
  constraint reports_terminal_closed check (
    (status in ('rejected', 'withdrawn', 'expired')) = (closed_at is not null)
    and (closed_at is null) = (purge_after is null)
    and (purge_after is null or purge_after = closed_at + interval '7 days'))
);
create index reports_published_location on app.reports using gist (location) where status = 'published';
create index reports_published_expiry on app.reports (expires_at) where status = 'published';
create index reports_purge on app.reports (purge_after) where purge_after is not null;
create index reports_author_recent on app.reports (author_id, received_at desc);
create index reports_review_queue on app.reports (status, received_at) where status in ('held', 'hidden');

-- Authoritative roles. Empty in this release: reviewer and admin workflows are deferred.
create table app.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('reviewer', 'admin')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

-- Append-only audit of report transitions. Holds no report content.
create table app.moderation_actions (
  id bigint generated always as identity primary key,
  report_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  actor_kind text not null check (actor_kind in ('system', 'author', 'reviewer', 'admin')),
  action text not null,
  from_status text,
  to_status text,
  reason_code text,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index moderation_actions_report on app.moderation_actions (report_id, created_at);

-- RLS enabled (not forced) with no policies: client roles are denied even if a grant slips in.
alter table app.app_config enable row level security;
alter table app.rmr_boundaries enable row level security;
alter table app.rmr_boundary_parts enable row level security;
alter table app.reports enable row level security;
alter table app.user_roles enable row level security;
alter table app.moderation_actions enable row level security;

-- Guard trigger: legal transitions and immutable fields. Catches bugs in any future function.
create function app.reports_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('held', 'published') then
      raise exception 'reports: new rows must be held or published' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.client_submission_id is distinct from old.client_submission_id
     or new.payload_hash is distinct from old.payload_hash
     or new.hazard_type is distinct from old.hazard_type
     or new.description is distinct from old.description
     or new.location_label is distinct from old.location_label
     or not extensions.st_equals(new.location, old.location)
     or new.location_source is distinct from old.location_source
     or new.gps_accuracy_m is distinct from old.gps_accuracy_m
     or new.boundary_id is distinct from old.boundary_id
     or new.observed_at is distinct from old.observed_at
     or new.received_at is distinct from old.received_at
     or new.rules_version is distinct from old.rules_version
     or new.review_deadline_at is distinct from old.review_deadline_at then
    raise exception 'reports: immutable field changed' using errcode = 'check_violation';
  end if;

  if new.author_id is distinct from old.author_id and new.author_id is not null then
    raise exception 'reports: author may only be cleared' using errcode = 'check_violation';
  end if;

  if old.first_published_at is not null and new.first_published_at is distinct from old.first_published_at then
    raise exception 'reports: first_published_at is set once' using errcode = 'check_violation';
  end if;
  if old.expires_at is not null and new.expires_at is distinct from old.expires_at then
    raise exception 'reports: expires_at is set once' using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'held' and new.status in ('published', 'rejected', 'expired', 'withdrawn'))
    or (old.status = 'published' and new.status in ('hidden', 'expired', 'withdrawn'))
    or (old.status = 'hidden' and new.status in ('published', 'rejected', 'expired', 'withdrawn'))) then
    raise exception 'reports: illegal transition % -> %', old.status, new.status using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger reports_guard
before insert or update on app.reports
for each row execute function app.reports_guard();

create function app.append_only_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The only permitted change is clearing actor_id when an account is deleted (ON DELETE SET NULL).
  if tg_op = 'UPDATE' and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception '%: append-only table', tg_table_name using errcode = 'insufficient_privilege';
end;
$$;

create trigger moderation_actions_append_only
before update or delete on app.moderation_actions
for each row execute function app.append_only_guard();

revoke all on all tables in schema app from public, anon, authenticated;
revoke all on all sequences in schema app from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;
