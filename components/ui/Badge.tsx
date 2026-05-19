import type { ProspectStatut } from '@/types';

const STATUT_STYLES: Record<
  ProspectStatut,
  { bg: string; color: string; label: string }
> = {
  nouveau: { bg: '#DBEAFE', color: '#1E40AF', label: 'Nouveau' },
  proposition_envoyee: {
    bg: '#FEF0E6',
    color: '#D96B0A',
    label: 'Proposition envoyée',
  },
  visite_planifiee: { bg: '#FEF3C7', color: '#92400E', label: 'Visite planifiée' },
  signe: { bg: '#D1FAE5', color: '#065F46', label: 'Signé' },
  perdu: { bg: '#FEE2E2', color: '#991B1B', label: 'Perdu' },
};

export function StatutBadge({ statut }: { statut: ProspectStatut }) {
  const s = STATUT_STYLES[statut];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  );
}

export function Badge({
  children,
  color = 'orange',
}: {
  children: React.ReactNode;
  color?: 'orange' | 'teal' | 'gray' | 'green';
}) {
  const styles: Record<typeof color, { bg: string; color: string }> = {
    orange: { bg: '#FEF0E6', color: '#D96B0A' },
    teal: { bg: '#CCFBF1', color: '#0D7C66' },
    gray: { bg: '#F3F4F6', color: '#374151' },
    green: { bg: '#D1FAE5', color: '#065F46' },
  };
  const s = styles[color];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}
