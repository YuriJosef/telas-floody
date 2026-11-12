import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

// Refuses anything that looks like a privileged key: only the publishable key may ship in the app.
export function isPublishableKey(key) {
  if (typeof key !== 'string' || !key.trim()) return false;
  if (key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const json = globalThis.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role === 'anon';
  } catch {
    return false;
  }
}

// A loopback backend (local Supabase) is reachable from a simulator or this computer's browser,
// never from a physical phone.
export const isLoopbackUrl = url => /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(String(url ?? '').trim());

export function createSupabase(auth) {
  const url = env.supabaseUrl.trim();
  const key = env.supabasePublishableKey.trim();
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) return null;
  if (!isPublishableKey(key)) return null;
  return createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, ...auth } });
}
