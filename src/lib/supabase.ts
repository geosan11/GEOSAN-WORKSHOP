import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isDemoMode: boolean = !url || !key || url.trim() === '';

export const supabase: SupabaseClient | null = !isDemoMode
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
