-- Floody 2.1 report API tests (pgTAP). Run with: npx supabase test db
-- Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(81);

-- Fixtures --------------------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'verified@floody.test', now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unverified@floody.test', null),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@floody.test', now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'busy@floody.test', now());

create schema tests;
create function tests.as_user(p_uid text, p_extra text default '') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || p_uid || '","role":"authenticated"' || p_extra || '}', true);
end $$;
create function tests.as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create function tests.submit(p_id text, p_hazard text, p_desc text, p_lat float8, p_lon float8,
  p_observed text default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
returns jsonb language sql as $$
  select public.submit_report(p_id::uuid, p_hazard, p_desc, 'Teste', p_lat, p_lon, 'gps', 12, p_observed)
$$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- 1. Privilege matrix ---------------------------------------------------------------------------
select ok(not has_schema_privilege('anon', 'app', 'usage'), 'anon has no usage on app');
select ok(not has_schema_privilege('authenticated', 'app', 'usage'), 'authenticated has no usage on app');
select ok(not has_table_privilege('anon', 'app.reports', 'select'), 'anon cannot select reports');
select ok(not has_table_privilege('authenticated', 'app.reports', 'insert,update,delete,select'), 'authenticated has no table rights');
select ok(has_function_privilege('anon', 'public.list_published_reports()', 'execute'), 'anon may list');
select ok(has_function_privilege('authenticated', 'public.list_published_reports()', 'execute'), 'authenticated may list');
select ok(not has_function_privilege('anon', 'public.submit_report(uuid,text,text,text,double precision,double precision,text,double precision,text)', 'execute'), 'anon may not submit');
select ok(has_function_privilege('authenticated', 'public.submit_report(uuid,text,text,text,double precision,double precision,text,double precision,text)', 'execute'), 'authenticated may submit');
select ok(not has_function_privilege('anon', 'public.my_access()', 'execute'), 'anon may not call my_access');
select ok(not has_function_privilege('anon', 'public.my_reports()', 'execute'), 'anon may not call my_reports');
select ok(not has_function_privilege('anon', 'public.withdraw_report(uuid)', 'execute'), 'anon may not withdraw');
select ok(not has_function_privilege('authenticated', 'app.effective_status(text,timestamp with time zone,timestamp with time zone)', 'execute'), 'helpers are not client-callable');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('list_published_reports','my_access','submit_report','my_reports','withdraw_report')
             and (not p.prosecdef or not ('search_path=""' = any(p.proconfig)))), 0,
          'public API functions are SECURITY DEFINER with empty search_path');

-- 2. Anonymous access fails closed --------------------------------------------------------------
set local role anon;
select throws_ok('select count(*) from app.reports', '42501', null, 'anon cannot read the table');
select throws_ok($$select public.submit_report(gen_random_uuid(), 'flood_impassable', 'x', null, -8.0631, -34.8711, 'gps', null, '2026-01-01T00:00:00Z')$$,
  '42501', null, 'anon cannot execute submit_report');
select lives_ok('select * from public.list_published_reports()', 'anon can list published reports');
reset role;

-- 3. Authentication and verification ------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
select is((select public.my_access()->>'code'), 'AUTH_REQUIRED', 'no sub claim means no session');
select is((tests.submit('aaaaaaaa-0000-4000-8000-000000000001', 'flood_impassable', 'Rua alagada', -8.0631, -34.8711))->>'code',
  'AUTH_REQUIRED', 'submit without a user is rejected');
select tests.as_owner();

select tests.as_user('22222222-2222-4222-8222-222222222222', ',"email_verified":true,"user_metadata":{"email_verified":true,"role":"admin"}');
select is((tests.submit('aaaaaaaa-0000-4000-8000-000000000002', 'flood_impassable', 'Rua alagada', -8.0631, -34.8711))->>'code',
  'EMAIL_NOT_VERIFIED', 'unverified user is rejected even with forged claims');
select is((select public.my_access()->'details'->>'email_verified'), 'false', 'my_access reads auth.users, not claims');
select tests.as_owner();

-- 4. Successful submission, idempotency, public output ------------------------------------------
select tests.as_user('11111111-1111-4111-8111-111111111111');
select is((tests.submit('bbbbbbbb-0000-4000-8000-000000000001', 'flood_impassable', 'Rua totalmente alagada', -8.06312345, -34.87114567))->>'code',
  'OK', 'verified user inside the RMR can submit');
select is((tests.submit('bbbbbbbb-0000-4000-8000-000000000001', 'flood_impassable', 'Rua totalmente alagada', -8.06312345, -34.87114567))->'report'->>'status',
  'published', 'clean report is published');
select is((tests.submit('bbbbbbbb-0000-4000-8000-000000000001', 'flood_impassable', 'Rua totalmente alagada', -8.06312345, -34.87114567))->>'replayed',
  'true', 'same id and payload is replayed');
select is((tests.submit('bbbbbbbb-0000-4000-8000-000000000001', 'flood_impassable', 'Outra descrição', -8.06312345, -34.87114567))->>'code',
  'IDEMPOTENCY_CONFLICT', 'same id with a different payload conflicts');
select tests.as_owner();
select is((select count(*)::int from app.reports where client_submission_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 1, 'replays stored one row');
select is((select author_id::text from app.reports where client_submission_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  '11111111-1111-4111-8111-111111111111', 'author comes from auth.uid()');
select is((select expires_at - first_published_at from app.reports where client_submission_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  interval '48 hours', 'published report expires 48 h after publication');
select is((select count(*)::int from app.moderation_actions m join app.reports r on r.id = m.report_id
           where r.client_submission_id = 'bbbbbbbb-0000-4000-8000-000000000001'), 1, 'one audit row per transition');

set local role anon;
select is((select count(*)::int from public.list_published_reports()), 1, 'another session (anon) sees the published report');
select is((select latitude from public.list_published_reports()), -8.0631::float8, 'public latitude is rounded to 4 decimals');
-- Stored at 5 decimals (-34.87115), published at 4: -34.8712.
select is((select longitude from public.list_published_reports()), -34.8712::float8, 'public longitude is rounded to 4 decimals');
select is((select verification from public.list_published_reports()), 'unverified_user_report', 'public rows are labelled unverified');
select ok(not (select bool_or(to_jsonb(l) ?| array['author_id','hold_reasons','payload_hash','client_submission_id'])
               from public.list_published_reports() l), 'public output has no author or moderation fields');
reset role;

-- 5. Validation, time window and service area ---------------------------------------------------
select tests.as_user('11111111-1111-4111-8111-111111111111');
select is((tests.submit('cccccccc-0000-4000-8000-000000000001', 'fire', 'x', -8.0631, -34.8711))->>'code', 'VALIDATION_FAILED', 'unknown hazard rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000002', 'traffic', '   ', -8.0631, -34.8711))->>'code', 'VALIDATION_FAILED', 'blank description rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000003', 'traffic', 'x', 'NaN'::float8, -34.8711))->>'code', 'VALIDATION_FAILED', 'NaN latitude rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000004', 'traffic', 'x', 95, -34.8711))->>'code', 'VALIDATION_FAILED', 'out-of-range latitude rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000005', 'traffic', 'x', -8.0631, -34.8711, '2026-11-10T10:00:00'))->>'code',
  'VALIDATION_FAILED', 'observed_at without an offset rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000006', 'traffic', 'x', -8.0631, -34.8711,
  to_char((now() - interval '6 hours 1 second') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))->>'code',
  'OBSERVATION_TOO_OLD', '6 h + 1 s old is rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000007', 'traffic', 'x', -8.0631, -34.8711,
  to_char((now() + interval '3 minutes') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))->>'code',
  'OBSERVED_AT_IN_FUTURE', '3 min in the future is rejected');
select is((tests.submit('cccccccc-0000-4000-8000-000000000008', 'traffic', 'x', -8.2849, -35.9699))->>'code', 'OUTSIDE_SERVICE_AREA', 'Caruaru is outside');
select is((tests.submit('cccccccc-0000-4000-8000-000000000009', 'traffic', 'x', 0, 0))->>'code', 'OUTSIDE_SERVICE_AREA', '(0,0) is outside');
select is((tests.submit('cccccccc-0000-4000-8000-00000000000a', 'traffic', 'x', -34.8711, -8.0631))->>'code', 'OUTSIDE_SERVICE_AREA', 'swapped coordinates are outside');
select tests.as_owner();

update app.rmr_boundaries set is_active = false;
select tests.as_user('11111111-1111-4111-8111-111111111111');
select is((tests.submit('cccccccc-0000-4000-8000-00000000000b', 'traffic', 'x', -8.0631, -34.8711))->>'code', 'SERVICE_UNAVAILABLE', 'no active boundary fails closed');
select tests.as_owner();
update app.rmr_boundaries set is_active = true;

-- Boundary data sanity (IBGE 2025, 14 municipalities).
select is((select cardinality(municipality_codes) from app.rmr_boundaries where is_active), 14, 'active boundary has 14 municipalities');
select ok((select bool_and(exists (select 1 from app.rmr_boundary_parts p join app.rmr_boundaries b on b.id = p.boundary_id and b.is_active
           where extensions.st_intersects(p.geom, extensions.st_setsrid(extensions.st_makepoint(pt.lon, pt.lat), 4326))))
           from (values (-8.0631, -34.8711), (-8.0089, -34.8553), (-8.1191, -34.8964), (-8.2836, -35.0353), (-7.8411, -34.9081)) pt(lat, lon)),
  'Recife, Olinda, Boa Viagem, Cabo and Igarassu centres are inside');
select ok((select not bool_or(exists (select 1 from app.rmr_boundary_parts p join app.rmr_boundaries b on b.id = p.boundary_id and b.is_active
           where extensions.st_intersects(p.geom, extensions.st_setsrid(extensions.st_makepoint(pt.lon, pt.lat), 4326))))
           from (values (-7.5606, -35.0026), (-8.06, -34.80), (-8.2849, -35.9699)) pt(lat, lon)),
  'Goiana, the open Atlantic and Caruaru are outside');

-- 6. Moderation hold and rate limit -------------------------------------------------------------
select tests.as_user('44444444-4444-4444-8444-444444444444');
select is((tests.submit('dddddddd-0000-4000-8000-000000000001', 'traffic', 'Veja www.exemplo.com', -8.05, -34.90))->'report'->>'status', 'held', 'URL in description is held');
select is((tests.submit('dddddddd-0000-4000-8000-000000000002', 'traffic', 'Trânsito parado', -8.05, -34.90))->'report'->>'status', 'held', 'same hazard within 100 m in 30 min is held');
select is((tests.submit('dddddddd-0000-4000-8000-000000000003', 'pothole', 'Buraco na Av. Alfredo Lisboa, CEP 50030-150', -8.10, -34.92))->'report'->>'status', 'published', 'a CEP is not mistaken for a phone number');
select is((tests.submit('dddddddd-0000-4000-8000-000000000004', 'roadworks', 'Obra, ligue (81) 99876-5432', -8.03, -34.95))->'report'->>'status', 'held', 'a phone number is held');
select lives_ok($$select tests.submit('dddddddd-0000-4000-8000-000000000005', 'flood_impassable', 'Alagado', -8.00, -34.88)$$, 'fifth submission');
select is((tests.submit('dddddddd-0000-4000-8000-000000000006', 'flood_impassable', 'Alagado de novo', -8.12, -34.93))->>'code', 'RATE_LIMITED', 'sixth submission in an hour is rate limited');
select tests.as_owner();
set local role anon;
select is((select count(*)::int from public.list_published_reports() where description like 'Veja%' or description = 'Trânsito parado'), 0, 'held reports are not public');
reset role;

-- 7. Expiry without maintenance, guard trigger ---------------------------------------------------
insert into app.reports (author_id, client_submission_id, payload_hash, hazard_type, description, location, location_source,
  boundary_id, observed_at, received_at, status, rules_version, review_deadline_at, first_published_at, expires_at)
select '33333333-3333-4333-8333-333333333333', 'eeeeeeee-0000-4000-8000-000000000001', sha256('x'::bytea), 'traffic', 'Relato antigo',
  extensions.st_setsrid(extensions.st_makepoint(-34.88, -8.06), 4326), 'gps', b.id,
  now() - interval '50 hours', now() - interval '49 hours 59 minutes', 'published', 1, now() - interval '25 hours 59 minutes',
  now() - interval '49 hours', now() - interval '1 hour'
from app.rmr_boundaries b where b.is_active;
set local role anon;
select is((select count(*)::int from public.list_published_reports() where description = 'Relato antigo'), 0, 'expired report is hidden even though the job never ran');
reset role;
select throws_ok($$update app.reports set expires_at = now() + interval '1 day' where description = 'Relato antigo'$$, '23514', null, 'expires_at cannot be extended');
select throws_ok($$insert into app.reports (author_id, client_submission_id, payload_hash, hazard_type, description, location, location_source,
  boundary_id, observed_at, received_at, status, rules_version, review_deadline_at, first_published_at, expires_at)
  select null, gen_random_uuid(), sha256('y'::bytea), 'traffic', 'Fora da janela', extensions.st_setsrid(extensions.st_makepoint(-34.88, -8.06), 4326),
  'gps', b.id, now() - interval '7 hours', now(), 'published', 1, now() + interval '1 day', now(), now() + interval '48 hours'
  from app.rmr_boundaries b where b.is_active$$, '23514', null, 'observation window CHECK backstops direct inserts');

-- 8. Withdrawal and ownership ---------------------------------------------------------------------
select tests.as_user('33333333-3333-4333-8333-333333333333');
select is((select public.withdraw_report((select id from public.list_published_reports() limit 1))->>'code'), 'NOT_FOUND', 'other users cannot withdraw');
select is((select count(*)::int from public.my_reports() where description = 'Rua totalmente alagada'), 0, 'my_reports shows only own rows');
select tests.as_user('11111111-1111-4111-8111-111111111111');
select is((select public.withdraw_report((select id from public.my_reports() where description = 'Rua totalmente alagada'))->>'code'), 'OK', 'author can withdraw');
select tests.as_owner();
set local role anon;
select is((select count(*)::int from public.list_published_reports() where description = 'Rua totalmente alagada'), 0, 'withdrawn report disappears immediately');
reset role;
select throws_ok($$update app.reports set status = 'published' where description = 'Rua totalmente alagada'$$, '23514', null, 'withdrawn is terminal');

-- 9. rules_version 2: whitespace-only text, trimming, withdrawn reports are not duplicates -----------
select tests.as_user('33333333-3333-4333-8333-333333333333');
select is((tests.submit('ffffffff-0000-4000-8000-000000000001', 'traffic', E'\n\t \n', -8.04, -34.89))->>'code',
  'VALIDATION_FAILED', 'line breaks and tabs only are not a description');
select is((tests.submit('ffffffff-0000-4000-8000-000000000002', 'traffic', U&'\200B\200B', -8.04, -34.89))->>'code',
  'VALIDATION_FAILED', 'invisible characters only are not a description');
select is((tests.submit('ffffffff-0000-4000-8000-000000000003', 'flood_impassable', E'\n Rua alagada perto da ponte \n', -8.04, -34.89))->'report'->>'status',
  'published', 'text surrounded by line breaks is accepted');
select is((tests.submit('ffffffff-0000-4000-8000-000000000003', 'flood_impassable', E'\n Rua alagada perto da ponte \n', -8.04, -34.89))->>'replayed',
  'true', 'the same untrimmed payload still replays');
select tests.as_owner();
select is((select description from app.reports where client_submission_id = 'ffffffff-0000-4000-8000-000000000003'),
  'Rua alagada perto da ponte', 'stored description is trimmed of all whitespace');
select is((select rules_version::int from app.reports where client_submission_id = 'ffffffff-0000-4000-8000-000000000003'), 2, 'new reports use rules_version 2');
select tests.as_user('33333333-3333-4333-8333-333333333333');
select is((select public.withdraw_report((select id from public.my_reports() where description = 'Rua alagada perto da ponte'))->>'code'), 'OK', 'author withdraws to correct the report');
select is((tests.submit('ffffffff-0000-4000-8000-000000000004', 'flood_impassable', 'Rua alagada perto da ponte, nível subindo', -8.0401, -34.89))->'report'->>'status',
  'published', 'a correction after withdrawal is not held as a duplicate');
select is((tests.submit('ffffffff-0000-4000-8000-000000000005', 'flood_impassable', 'Ainda alagada', -8.0402, -34.89))->'report'->>'status',
  'held', 'a nearby duplicate of a live report is still held');
select tests.as_owner();

-- 10. rules_version 2: text rules without the known false positives -----------------------------
select ok(not has_function_privilege('authenticated', 'app.text_hold_reasons(text)', 'execute'), 'text rules are not client-callable');
select is(app.text_hold_reasons('Alagamento em -8.0512345678, -34.9012345678'), '{}'::text[], 'long decimal coordinates are not a phone');
select is(app.text_hold_reasons('Rua alagada.Com carros parados'), '{}'::text[], 'a missing space before "Com" is not a link');
select is(app.text_hold_reasons('Perto da Rua do Bom Jesus.Me ajudem'), '{}'::text[], 'a missing space before "Me" is not a link');
select is(app.text_hold_reasons('Buraco na Av. Recife, 1234, CEP 50030-150'), '{}'::text[], 'an address with a number and CEP is clean');
select is(app.text_hold_reasons('Promoção em golpe.com.br'), '{CONTAINS_URL}'::text[], 'a lower-case .com.br domain is a link');
select is(app.text_hold_reasons('acesse news.golpe.com/x agora'), '{CONTAINS_URL}'::text[], 'a subdomain with a path is a link');
select is(app.text_hold_reasons('Veja HTTPS://Exemplo.org'), '{CONTAINS_URL}'::text[], 'an upper-case http link is still caught');
select is(app.text_hold_reasons('fale com fulano@exemplo.com'), '{CONTAINS_EMAIL}'::text[], 'an e-mail is held as e-mail, not also as a link');
select is(app.text_hold_reasons('Ligue +55 81 99876-5432.'), '{CONTAINS_PHONE}'::text[], 'a phone number is still held');

select * from finish();
rollback;
