-- Floody 2.1: controlled API for reports (docs/floody-2.1/ARCHITECTURE.md §3–§5).
-- Every public function is SECURITY DEFINER with an empty search_path, revoked from everyone and
-- granted explicitly. Identity comes from auth.uid(); verification and roles are read from tables
-- at call time, never from JWT claims or user metadata.
--
-- Implemented now: list_published_reports, my_access, submit_report, my_reports, withdraw_report.
-- Deferred (spec §3): flag_report, review_queue, review_report, list_reviewers, set_reviewer,
-- delete_my_account, app.run_lifecycle_maintenance.

-- ---------------------------------------------------------------------------------------------
-- Internal helpers (schema `app`, not callable by clients)
-- ---------------------------------------------------------------------------------------------

create function app.config_int(p_key text) returns int
language sql stable
set search_path = ''
as $$ select (value #>> '{}')::int from app.app_config where key = p_key $$;

-- The single definition of public visibility. A late maintenance job cannot expose anything.
create function app.is_public(p_status text, p_expires_at timestamptz) returns boolean
language sql stable
set search_path = ''
as $$ select p_status = 'published' and p_expires_at is not null and now() < p_expires_at $$;

-- Status as seen right now, whether or not maintenance has materialized it.
create function app.effective_status(p_status text, p_expires_at timestamptz, p_review_deadline_at timestamptz)
returns text
language sql stable
set search_path = ''
as $$
  select case
    when p_status in ('published', 'hidden') and now() >= p_expires_at then 'expired'
    when p_status = 'held' and now() >= p_review_deadline_at then 'expired'
    else p_status
  end
$$;

create function app.result(
  p_ok boolean, p_code text, p_retryable boolean default false, p_replayed boolean default false,
  p_report jsonb default null, p_details jsonb default '{}'::jsonb)
returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object('ok', p_ok, 'code', p_code, 'retryable', p_retryable,
    'replayed', p_replayed, 'report', p_report, 'details', coalesce(p_details, '{}'::jsonb))
$$;

-- ---------------------------------------------------------------------------------------------
-- list_published_reports(): anon and authenticated
-- ---------------------------------------------------------------------------------------------

create function public.list_published_reports()
returns table (
  id uuid,
  hazard_type text,
  description text,
  location_label text,
  latitude double precision,
  longitude double precision,
  location_source text,
  verification text,
  observed_at timestamptz,
  first_published_at timestamptz,
  expires_at timestamptz
)
language sql stable
security definer
set search_path = ''
as $$
  select r.id, r.hazard_type, r.description, r.location_label,
    round(extensions.st_y(r.location)::numeric, 4)::double precision,
    round(extensions.st_x(r.location)::numeric, 4)::double precision,
    r.location_source,
    'unverified_user_report'::text,
    r.observed_at, r.first_published_at, r.expires_at
  from app.reports r
  where r.status = 'published' and app.is_public(r.status, r.expires_at)
  order by r.first_published_at desc
  limit (select app.config_int('public_list_limit'))
$$;

-- ---------------------------------------------------------------------------------------------
-- my_access(): authenticated
-- ---------------------------------------------------------------------------------------------

create function public.my_access() returns jsonb
language plpgsql stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user record;
begin
  if v_uid is null then
    return app.result(false, 'AUTH_REQUIRED');
  end if;
  select u.email_confirmed_at, coalesce(u.is_anonymous, false) as is_anonymous, u.banned_until
    into v_user from auth.users u where u.id = v_uid;
  if not found then
    return app.result(false, 'AUTH_REQUIRED');
  end if;
  return app.result(true, 'OK', p_details => jsonb_build_object(
    'email_verified', v_user.email_confirmed_at is not null and not v_user.is_anonymous,
    'banned', v_user.banned_until is not null and v_user.banned_until > now(),
    'roles', coalesce((select jsonb_agg(r.role) from app.user_roles r where r.user_id = v_uid), '[]'::jsonb)));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- submit_report(): authenticated; verified email enforced inside
-- ---------------------------------------------------------------------------------------------

create function public.submit_report(
  p_client_submission_id uuid,
  p_hazard_type text,
  p_description text,
  p_location_label text,
  p_latitude double precision,
  p_longitude double precision,
  p_location_source text,
  p_gps_accuracy_m double precision,
  p_observed_at text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_hash bytea;
  v_existing record;
  v_user record;
  v_fields text[] := '{}';
  v_description text := btrim(coalesce(p_description, ''));
  v_label text := nullif(btrim(coalesce(p_location_label, '')), '');
  v_observed timestamptz;
  v_boundary int;
  v_point extensions.geometry;
  v_recent_hour int;
  v_recent_day int;
  v_oldest timestamptz;
  v_reasons text[] := '{}';
  v_status text;
  v_id uuid;
  v_first_published timestamptz;
  v_expires timestamptz;
begin
  -- 1. Session.
  if v_uid is null then
    return app.result(false, 'AUTH_REQUIRED');
  end if;
  if p_client_submission_id is null then
    return app.result(false, 'VALIDATION_FAILED', p_details => jsonb_build_object('fields', jsonb_build_array('client_submission_id')));
  end if;

  -- 2. Per-user lock: serializes idempotency and rate limiting for this author.
  perform pg_advisory_xact_lock(hashtextextended('floody:submit:' || v_uid::text, 0));

  -- 3. Idempotency lookup, before every other check (a retry after 6 h still returns the original).
  v_hash := sha256(convert_to(jsonb_build_array(
    p_hazard_type, v_description, v_label, p_latitude::text, p_longitude::text,
    p_location_source, p_gps_accuracy_m::text, btrim(coalesce(p_observed_at, '')))::text, 'UTF8'));
  select r.id, r.status, r.expires_at, r.review_deadline_at, r.payload_hash
    into v_existing from app.reports r
    where r.author_id = v_uid and r.client_submission_id = p_client_submission_id;
  if found then
    if v_existing.payload_hash = v_hash then
      return app.result(true, 'OK', p_replayed => true, p_report => jsonb_build_object(
        'id', v_existing.id,
        'status', app.effective_status(v_existing.status, v_existing.expires_at, v_existing.review_deadline_at),
        'expires_at', v_existing.expires_at));
    end if;
    return app.result(false, 'IDEMPOTENCY_CONFLICT', p_report => jsonb_build_object('id', v_existing.id));
  end if;

  -- 4. Verified email, read from auth.users (never from the JWT).
  select u.email_confirmed_at, coalesce(u.is_anonymous, false) as is_anonymous, u.banned_until
    into v_user from auth.users u where u.id = v_uid;
  if not found then
    return app.result(false, 'AUTH_REQUIRED');
  end if;
  if v_user.is_anonymous or v_user.email_confirmed_at is null then
    return app.result(false, 'EMAIL_NOT_VERIFIED');
  end if;
  if v_user.banned_until is not null and v_user.banned_until > v_now then
    return app.result(false, 'FORBIDDEN');
  end if;

  -- 5. Field validation.
  if p_hazard_type is null or p_hazard_type not in ('flood_impassable', 'pothole', 'roadworks', 'traffic') then
    v_fields := array_append(v_fields, 'hazard_type');
  end if;
  if char_length(v_description) not between 1 and 2000 then
    v_fields := array_append(v_fields, 'description');
  end if;
  if v_label is not null and char_length(v_label) > 200 then
    v_fields := array_append(v_fields, 'location_label');
  end if;
  if p_latitude is null or p_latitude = 'NaN'::float8 or p_latitude not between -90 and 90 then
    v_fields := array_append(v_fields, 'latitude');
  end if;
  if p_longitude is null or p_longitude = 'NaN'::float8 or p_longitude not between -180 and 180 then
    v_fields := array_append(v_fields, 'longitude');
  end if;
  if p_location_source is null or p_location_source not in ('gps', 'manual') then
    v_fields := array_append(v_fields, 'location_source');
  end if;
  if p_gps_accuracy_m is not null and (p_gps_accuracy_m = 'NaN'::float8 or p_gps_accuracy_m not between 0 and 100000) then
    v_fields := array_append(v_fields, 'gps_accuracy_m');
  end if;
  -- ISO 8601 with an explicit offset; a bare local time would be read in the server time zone.
  if p_observed_at is null
     or btrim(p_observed_at) !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$' then
    v_fields := array_append(v_fields, 'observed_at');
  else
    begin
      v_observed := btrim(p_observed_at)::timestamptz;
    exception when others then
      v_fields := array_append(v_fields, 'observed_at');
    end;
  end if;
  if cardinality(v_fields) > 0 then
    return app.result(false, 'VALIDATION_FAILED', p_details => jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;

  -- 6. Observation window, by server time.
  if v_observed > v_now + interval '2 minutes' then
    return app.result(false, 'OBSERVED_AT_IN_FUTURE', p_details => jsonb_build_object('server_time', v_now));
  end if;
  if v_observed < v_now - interval '6 hours' then
    return app.result(false, 'OBSERVATION_TOO_OLD', p_details => jsonb_build_object('server_time', v_now));
  end if;

  -- 7. Service area. Fails closed when no boundary is active.
  select b.id into v_boundary from app.rmr_boundaries b where b.is_active;
  if v_boundary is null then
    return app.result(false, 'SERVICE_UNAVAILABLE', p_retryable => true);
  end if;
  v_point := extensions.st_setsrid(extensions.st_makepoint(
    round(p_longitude::numeric, 5)::double precision, round(p_latitude::numeric, 5)::double precision), 4326);
  if not exists (
    select 1 from app.rmr_boundary_parts p
    where p.boundary_id = v_boundary and extensions.st_intersects(p.geom, v_point)) then
    return app.result(false, 'OUTSIDE_SERVICE_AREA');
  end if;

  -- 8. Rate limit, counted from stored reports under the per-user lock.
  select count(*) filter (where r.received_at > v_now - interval '1 hour'),
         count(*),
         min(r.received_at) filter (where r.received_at > v_now - interval '1 hour')
    into v_recent_hour, v_recent_day, v_oldest
    from app.reports r
    where r.author_id = v_uid and r.received_at > v_now - interval '24 hours';
  if v_recent_hour >= app.config_int('submit_limit_per_hour') then
    return app.result(false, 'RATE_LIMITED', p_retryable => true, p_details => jsonb_build_object(
      'retry_after_s', greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - v_now))))::int));
  end if;
  if v_recent_day >= app.config_int('submit_limit_per_day') then
    select min(r.received_at) into v_oldest from app.reports r
      where r.author_id = v_uid and r.received_at > v_now - interval '24 hours';
    return app.result(false, 'RATE_LIMITED', p_retryable => true, p_details => jsonb_build_object(
      'retry_after_s', greatest(1, ceil(extract(epoch from (v_oldest + interval '24 hours' - v_now))))::int));
  end if;

  -- 9. Deterministic moderation rules (rules_version 1), then insert.
  if (v_description || ' ' || coalesce(v_label, '')) ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|br|io|me|ly)(/|\s|$))' then
    v_reasons := array_append(v_reasons, 'CONTAINS_URL');
  end if;
  if (v_description || ' ' || coalesce(v_label, '')) ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    v_reasons := array_append(v_reasons, 'CONTAINS_EMAIL');
  end if;
  -- Brazilian phone: optional +55, 2-digit area code, 8 or 9 digits. A CEP (5+3 digits) never matches.
  if (v_description || ' ' || coalesce(v_label, '')) ~ '(^|[^0-9])(\+?55[\s.-]?)?\(?[1-9][0-9]\)?[\s.-]?9?[0-9]{4}[\s.-]?[0-9]{4}([^0-9]|$)' then
    v_reasons := array_append(v_reasons, 'CONTAINS_PHONE');
  end if;
  if exists (
    select 1 from app.reports r
    where r.author_id = v_uid and r.hazard_type = p_hazard_type
      and r.received_at > v_now - interval '30 minutes'
      and extensions.st_dwithin(r.location::extensions.geography, v_point::extensions.geography, 100)) then
    v_reasons := array_append(v_reasons, 'DUPLICATE_NEARBY');
  end if;
  if (select count(*) from app.reports r
      where r.author_id = v_uid and r.status = 'rejected' and r.received_at > v_now - interval '30 days') >= 2 then
    v_reasons := array_append(v_reasons, 'PRIOR_REJECTIONS');
  end if;

  if cardinality(v_reasons) > 0 then
    v_status := 'held';
  else
    v_status := 'published';
    v_first_published := v_now;
    v_expires := v_now + interval '48 hours';
  end if;

  insert into app.reports (
    author_id, client_submission_id, payload_hash, hazard_type, description, location_label, location,
    location_source, gps_accuracy_m, boundary_id, observed_at, received_at, status, hold_reasons,
    rules_version, review_deadline_at, first_published_at, expires_at)
  values (
    v_uid, p_client_submission_id, v_hash, p_hazard_type, v_description, v_label, v_point,
    p_location_source, p_gps_accuracy_m, v_boundary, v_observed, v_now, v_status, v_reasons,
    app.config_int('rules_version'), v_now + make_interval(hours => app.config_int('review_window_hours')),
    v_first_published, v_expires)
  returning id into v_id;

  insert into app.moderation_actions (report_id, actor_id, actor_kind, action, from_status, to_status, reason_code)
  values (v_id, v_uid, 'author', 'submit', null, v_status,
          case when cardinality(v_reasons) > 0 then array_to_string(v_reasons, ',') end);

  return app.result(true, 'OK', p_report => jsonb_build_object('id', v_id, 'status', v_status, 'expires_at', v_expires));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- my_reports(): authenticated, own rows only. Hold reasons stay reviewer-only.
-- ---------------------------------------------------------------------------------------------

create function public.my_reports()
returns table (
  id uuid,
  client_submission_id uuid,
  hazard_type text,
  description text,
  location_label text,
  latitude double precision,
  longitude double precision,
  location_source text,
  observed_at timestamptz,
  received_at timestamptz,
  status text,
  first_published_at timestamptz,
  expires_at timestamptz,
  closed_at timestamptz
)
language sql stable
security definer
set search_path = ''
as $$
  select r.id, r.client_submission_id, r.hazard_type, r.description, r.location_label,
    extensions.st_y(r.location), extensions.st_x(r.location), r.location_source,
    r.observed_at, r.received_at,
    app.effective_status(r.status, r.expires_at, r.review_deadline_at),
    r.first_published_at, r.expires_at, r.closed_at
  from app.reports r
  where auth.uid() is not null and r.author_id = auth.uid()
  order by r.received_at desc
  limit 200
$$;

-- ---------------------------------------------------------------------------------------------
-- withdraw_report(): authenticated, author only; immediate removal from public view.
-- ---------------------------------------------------------------------------------------------

create function public.withdraw_report(p_report_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_report record;
  v_effective text;
begin
  if v_uid is null then
    return app.result(false, 'AUTH_REQUIRED');
  end if;
  select r.id, r.status, r.expires_at, r.review_deadline_at into v_report
    from app.reports r
    where r.id = p_report_id and r.author_id = v_uid
    for update;
  if not found then
    return app.result(false, 'NOT_FOUND');
  end if;
  v_effective := app.effective_status(v_report.status, v_report.expires_at, v_report.review_deadline_at);
  if v_effective not in ('held', 'published', 'hidden') then
    return app.result(false, 'CONFLICT_STATE', p_details => jsonb_build_object('status', v_effective));
  end if;
  update app.reports
    set status = 'withdrawn', closed_at = now(), purge_after = now() + interval '7 days'
    where id = v_report.id;
  insert into app.moderation_actions (report_id, actor_id, actor_kind, action, from_status, to_status)
  values (v_report.id, v_uid, 'author', 'withdraw', v_report.status, 'withdrawn');
  return app.result(true, 'OK', p_report => jsonb_build_object('id', v_report.id, 'status', 'withdrawn'));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Privileges: revoke everything, then grant exactly the matrix in spec §3.
-- ---------------------------------------------------------------------------------------------

revoke all on all functions in schema app from public, anon, authenticated;

revoke all on function public.list_published_reports() from public, anon, authenticated;
revoke all on function public.my_access() from public, anon, authenticated;
revoke all on function public.submit_report(uuid, text, text, text, double precision, double precision, text, double precision, text) from public, anon, authenticated;
revoke all on function public.my_reports() from public, anon, authenticated;
revoke all on function public.withdraw_report(uuid) from public, anon, authenticated;

grant execute on function public.list_published_reports() to anon, authenticated;
grant execute on function public.my_access() to authenticated;
grant execute on function public.submit_report(uuid, text, text, text, double precision, double precision, text, double precision, text) to authenticated;
grant execute on function public.my_reports() to authenticated;
grant execute on function public.withdraw_report(uuid) to authenticated;
