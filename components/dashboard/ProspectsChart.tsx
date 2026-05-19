'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const DATA = [
  { mois: 'Nov',  prospects: 12, propositions: 8,  signes: 2 },
  { mois: 'Déc',  prospects: 18, propositions: 12, signes: 3 },
  { mois: 'Jan',  prospects: 22, propositions: 15, signes: 4 },
  { mois: 'Fév',  prospects: 28, propositions: 19, signes: 6 },
  { mois: 'Mar',  prospects: 35, propositions: 24, signes: 7 },
  { mois: 'Avr',  prospects: 42, propositions: 28, signes: 9 },
  { mois: 'Mai',  prospects: 38, propositions: 26, signes: 8 },
];

export function ProspectsChart() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold">Activité mensuelle</h3>
          <p className="text-sm text-text-muted mt-0.5">
            Prospects, propositions et signatures sur 7 mois
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} barGap={4} barCategoryGap="20%">
            <CartesianGrid stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="mois"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(245, 130, 31, 0.05)' }}
              contentStyle={{
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(15,25,35,0.08)',
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="prospects" name="Prospects" fill="#F5821F" radius={[6, 6, 0, 0]} />
            <Bar dataKey="propositions" name="Propositions" fill="#0D7C66" radius={[6, 6, 0, 0]} />
            <Bar dataKey="signes" name="Signés" fill="#9CA3AF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
