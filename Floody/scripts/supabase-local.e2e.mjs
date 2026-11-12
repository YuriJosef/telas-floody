// End-to-end checks against the LOCAL Supabase stack only (Docker + `npx supabase start`).
// Run from Floody/: node scripts/supabase-local.e2e.mjs
// It creates throwaway accounts (confirmed through the local Mailpit inbox) and refuses any
// non-loopback URL, so it can never touch the remote project.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const { signOutThisDevice, accountFromSession } = await import(pathToFileURL(path.resolve('src/store/authSession.js')).href);

function localConfig() {
  let url = process.env.SUPABASE_LOCAL_URL;
  let key = process.env.SUPABASE_LOCAL_PUBLISHABLE_KEY;
  if (!url || !key) {
    const status = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: true });
    const read = name => status.match(new RegExp(`^${name}="?([^"\\r\\n]+)`, 'm'))?.[1];
    url ??= read('API_URL');
    key ??= read('PUBLISHABLE_KEY');
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url ?? '')) throw new Error(`Refusing to run against a non-local Supabase URL: ${url}`);
  if (!key?.startsWith('sb_publishable_')) throw new Error('A local publishable key is required.');
  return { url, key, mailpit: process.env.SUPABASE_LOCAL_MAILPIT ?? 'http://127.0.0.1:54324' };
}

const { url, key, mailpit } = localConfig();
const results = [];
const check = (name, ok, detail) => results.push({ ok: Boolean(ok), name, detail: ok ? '' : JSON.stringify(detail) });
const password = `Floody-e2e-${randomUUID().slice(0, 8)}`;

function memoryStorage() {
  const map = new Map();
  const state = { failRemove: false };
  return {
    map, state,
    getItem: async k => map.get(k) ?? null,
    setItem: async (k, v) => { map.set(k, v); },
    removeItem: async k => { if (state.failRemove) throw new Error('storage unavailable'); map.delete(k); },
  };
}

function client(storage, { failLogout } = {}) {
  const fetchImpl = (input, init) => (failLogout?.value && String(input).includes('/logout'))
    ? Promise.reject(new TypeError('Network request failed')) : fetch(input, init);
  return createClient(url, key, { auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: fetchImpl } });
}

async function confirmedAccount(label) {
  const email = `e2e-${label}-${Date.now()}-${randomUUID().slice(0, 6)}@floody.test`;
  const c = client(memoryStorage());
  const signUp = await c.auth.signUp({ email, password });
  check(`${label}: sign-up returns no session before confirmation`, !signUp.error && !signUp.data.session, signUp.error);
  const early = await c.auth.signInWithPassword({ email, password });
  check(`${label}: unconfirmed account cannot sign in`, early.error?.code === 'email_not_confirmed', early.error);
  const found = await (await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
  const message = await (await fetch(`${mailpit}/api/v1/message/${found.messages[0].ID}`)).json();
  const link = message.Text.match(/https?:\/\/\S+verify\S+/)?.[0]?.replace(/&amp;/g, '&');
  const confirm = await fetch(link, { redirect: 'manual' });
  check(`${label}: confirmation link accepted`, [302, 303].includes(confirm.status), confirm.status);
  return email;
}

const payload = (overrides = {}) => ({
  p_client_submission_id: randomUUID(), p_hazard_type: 'flood_impassable', p_description: 'E2E: rua alagada',
  p_location_label: 'Marco Zero', p_latitude: -8.0631, p_longitude: -34.8711, p_location_source: 'gps',
  p_gps_accuracy_m: 10, p_observed_at: new Date().toISOString(), ...overrides,
});

// Guest boundary
const guest = client(memoryStorage());
let r = await guest.rpc('list_published_reports');
check('guest can list published reports', !r.error, r.error);
r = await guest.rpc('submit_report', payload());
check('guest cannot submit', r.error?.code === '42501', r.error ?? r.data);
r = await fetch(`${url}/rest/v1/reports?select=*`, { headers: { apikey: key, 'Accept-Profile': 'app' } });
check('private app schema is not exposed', r.status >= 400, r.status);

const emailA = await confirmedAccount('a');
const emailB = await confirmedAccount('b');

// Session restoration: a new client over the same storage restores the session.
const sharedStorage = memoryStorage();
const first = client(sharedStorage);
r = await first.auth.signInWithPassword({ email: emailA, password });
check('A signs in', !r.error, r.error);
const userA = r.data.user?.id;
const restored = await client(sharedStorage).auth.getSession();
check('session is restored from storage by a new client', restored.data.session?.user?.id === userA, restored.error);
check('restored account object carries no e-mail', !JSON.stringify(accountFromSession(restored.data.session)).includes('@'));

// Logout: success, failed server call, failed storage removal.
let out = await signOutThisDevice(first.auth);
check('logout succeeds and leaves no stored session', out.signedOut && sharedStorage.map.size === 0, { out, keys: sharedStorage.map.size });

const offlineFlag = { value: false };
const offlineStorage = memoryStorage();
const offline = client(offlineStorage, { failLogout: offlineFlag });
await offline.auth.signInWithPassword({ email: emailA, password });
offlineFlag.value = true;
out = await signOutThisDevice(offline.auth);
check('logout without network still signs this device out', out.signedOut && offlineStorage.map.size === 0, { out, keys: offlineStorage.map.size });

const brokenStorage = memoryStorage();
const broken = client(brokenStorage);
await broken.auth.signInWithPassword({ email: emailA, password });
brokenStorage.state.failRemove = true;
out = await signOutThisDevice(broken.auth);
brokenStorage.state.failRemove = false;
check('logout that cannot clear storage reports failure and keeps the account', !out.signedOut && /Não foi possível sair/.test(out.error) && out.session?.user?.id === userA, { signedOut: out.signedOut, error: out.error });
await signOutThisDevice(broken.auth);

// Account switch on one device: A out, B in; storage only holds B.
const deviceStorage = memoryStorage();
const device = client(deviceStorage);
await device.auth.signInWithPassword({ email: emailA, password });
const concurrentId = randomUUID();
const body = payload({ p_client_submission_id: concurrentId });
const [one, two] = await Promise.all([device.rpc('submit_report', body), device.rpc('submit_report', body)]);
const ids = [one.data?.report?.id, two.data?.report?.id];
check('concurrent identical submissions return one report', one.data?.ok && two.data?.ok && ids[0] && ids[0] === ids[1], { one: one.data, two: two.data });
check('exactly one of the concurrent calls is a replay', [one.data?.replayed, two.data?.replayed].filter(Boolean).length === 1, { one: one.data, two: two.data });
const mineA = await device.rpc('my_reports');
check('the concurrent pair stored a single row', mineA.data?.filter(row => row.client_submission_id === concurrentId).length === 1, mineA.error);
const reportA = ids[0];
const held = await device.rpc('submit_report', payload({ p_hazard_type: 'traffic', p_description: 'Veja www.exemplo.com', p_latitude: -8.05, p_longitude: -34.9 }));
check('a report with a link is held, not published', held.data?.report?.status === 'held', held.data);
r = await guest.rpc('list_published_reports');
check('held report is not public', !r.data?.some(row => row.id === held.data?.report?.id), r.error);
await signOutThisDevice(device.auth);
r = await device.auth.signInWithPassword({ email: emailB, password });
const userB = r.data.user?.id;
check('B signs in on the same device', !r.error && userB && userB !== userA, r.error);
const authKeys = [...deviceStorage.map.keys()].filter(k => k.endsWith('-auth-token'));
const stored = JSON.parse(deviceStorage.map.get(authKeys[0]) ?? '{}');
check('device storage holds only the new account', authKeys.length === 1 && stored.user?.id === userB, { authKeys: authKeys.length });
const mineB = await device.rpc('my_reports');
check("B does not see A's reports", !mineB.error && !mineB.data.some(row => row.id === reportA), mineB.error);
r = await device.rpc('withdraw_report', { p_report_id: reportA });
check("B cannot withdraw A's report", r.data?.code === 'NOT_FOUND', r.data);
r = await guest.rpc('list_published_reports');
check("A's report is still public after B's attempt", r.data?.some(row => row.id === reportA), r.error);
await signOutThisDevice(device.auth);

// Author withdrawal
const author = client(memoryStorage());
await author.auth.signInWithPassword({ email: emailA, password });
r = await author.rpc('withdraw_report', { p_report_id: reportA });
check('author withdraws', r.data?.ok === true, r.data);
r = await author.rpc('withdraw_report', { p_report_id: reportA });
check('second withdrawal reports the report as already withdrawn', r.data?.code === 'CONFLICT_STATE' && r.data.details?.status === 'withdrawn', r.data);
r = await guest.rpc('list_published_reports');
check('withdrawn report disappears for other sessions', !r.data?.some(row => row.id === reportA), r.error);
await signOutThisDevice(author.auth);

for (const { ok, name, detail } of results) console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
const failed = results.filter(item => !item.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
