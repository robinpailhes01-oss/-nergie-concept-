// ============================================================
// Client Supabase — fonctionne aussi en mode démo (sans clé)
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (_client) return _client;
  _client = createClient(url as string, anonKey as string, {
    auth: { persistSession: false },
  });
  return _client;
}
