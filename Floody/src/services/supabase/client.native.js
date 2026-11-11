import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabase } from './createSupabase';

// Native: session in AsyncStorage (unencrypted; see ARCHITECTURE.md §7). No deep links in 2.1.
export const supabase = createSupabase({ storage: AsyncStorage, detectSessionInUrl: false });

if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
