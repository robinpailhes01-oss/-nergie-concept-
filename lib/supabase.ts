// ============================================================
// Client Supabase — fonctionne aussi en mode démo (sans clé)
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Base de production Énergies Concept (clé anon publique, RLS active).
//
// La connexion est volontairement définie ici plutôt que par variables
// d'environnement : plusieurs projets Supabase se sont succédé et des
// variables obsolètes côté hébergeur désignaient encore des projets
// supprimés, ce qui basculait silencieusement le CRM en mode démo.
// Pour changer de base, modifier ces deux constantes.
const url = 'https://szdfpjyytwedhochvzfd.supabase.co';
const anonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6ZGZwanl5dHdlZGhvY2h2emZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzExMDEsImV4cCI6MjA5NTM0NzEwMX0.LKISYgm1CBPYP4VfvH_S6C7meSQb1H57LxkldF9UhC0';

export const supabaseEnabled = Boolean(url && anonKey);

/** Hôte réellement utilisé — utile pour diagnostiquer une configuration d'hébergeur. */
export const supabaseHost = url.replace(/^https?:\/\//, '').split('.')[0];

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (_client) return _client;
  _client = createClient(url as string, anonKey as string, {
    auth: { persistSession: false },
  });
  return _client;
}
