'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLocalProspects } from '@/lib/demo-store';
import { buildPropositionHTML } from '@/lib/proposition-build';
import { PropositionViewer } from './PropositionViewer';
import type { Prospect } from '@/types';

// Fallback démo : le prospect a été créé côté navigateur (localStorage)
// et n'existe pas côté serveur. On régénère la proposition localement.
export function PropositionFallback({ id }: { id: string }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'found'; prospect: Prospect } | { status: 'missing' }
  >({ status: 'loading' });

  useEffect(() => {
    const prospect = getLocalProspects().find(
      (p) => p.id === id || p.proposition_id === id,
    );
    setState(prospect ? { status: 'found', prospect } : { status: 'missing' });
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Chargement de la proposition…
      </div>
    );
  }

  if (state.status === 'missing') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div
            className="font-display text-6xl font-bold mb-2"
            style={{ color: '#F5821F' }}
          >
            404
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">
            Proposition introuvable
          </h1>
          <p className="text-text-muted mb-6 max-w-md">
            Ce lien de proposition n'est pas disponible sur cet appareil.
          </p>
          <Link href="/" className="btn btn-primary">
            Retour au dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { prospect } = state;
  return (
    <PropositionViewer
      html={buildPropositionHTML(prospect)}
      prospectId={prospect.id}
      prenom={prospect.prenom}
      nom={prospect.nom}
      propositionId={prospect.proposition_id ?? id}
    />
  );
}
