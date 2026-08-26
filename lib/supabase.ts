// ============================================================
// Client Supabase — fonctionne aussi en mode démo (sans clé)
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Base de production Énergies Concept. Les variables d'environnement
// restent prioritaires ; ces valeurs servent de repli pour que le CRM
// fonctionne sans configuration côté hébergeur (clé anon publique).
const DEFAULT_URL = 'https://szdfpjyytwedhochvzfd.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6ZGZwanl5dHdlZGhvY2h2emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzExMDEsImV4cCI6MjA5NTM0NzEwMX0.LKISYgm1CBPYP4VfvH_S6C7meSQb1H57LxkldF9UhC0';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

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
