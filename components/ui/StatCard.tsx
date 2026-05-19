import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  iconColor?: 'orange' | 'teal' | 'blue' | 'purple';
}

const ICON_BG: Record<NonNullable<StatCardProps['iconColor']>, string> = {
  orange: 'linear-gradient(135deg, #FEF0E6 0%, #FCD7B4 100%)',
  teal: 'linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%)',
  blue: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
  purple: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
};

const ICON_COLOR: Record<NonNullable<StatCardProps['iconColor']>, string> = {
  orange: '#D96B0A',
  teal: '#0D7C66',
  blue: '#1D4ED8',
  purple: '#6D28D9',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendPositive = true,
  iconColor = 'orange',
}: StatCardProps) {
  return (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-text-muted font-medium">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold leading-tight">
            {value}
          </div>
          {trend && (
            <div
              className="text-xs mt-1.5 font-medium"
              style={{ color: trendPositive ? '#0D7C66' : '#DC2626' }}
            >
              {trend}
            </div>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: ICON_BG[iconColor] }}
        >
          <Icon className="w-5 h-5" style={{ color: ICON_COLOR[iconColor] }} />
        </div>
      </div>
    </div>
  );
}
