import { createSupabase } from './createSupabase';

// Web: session in localStorage; the e-mail confirmation link returns to this app.
export const supabase = typeof window === 'undefined' ? null : createSupabase({ detectSessionInUrl: true });
