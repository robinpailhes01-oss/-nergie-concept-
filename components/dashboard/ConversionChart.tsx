'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeeklyConversion } from '@/lib/chart-data';

interface Props {
  data: WeeklyConversion[];
  moyenne: number;
}

export function ConversionChart({ data, moyenne }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold">
            Taux de conversion
          </h3>
          <p className="text-sm text-text-muted mt-0.5">
            % propositions → signatures, {data.length} dernières semaines
          </p>
        </div>
        <div
          className="text-3xl font-display font-bold"
          style={{ color: '#F5821F' }}
        >
          {moyenne}%
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="gradLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5821F" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#F5821F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="sem"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              cursor={{ stroke: '#F5821F', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(v: number) => [`${v}%`, 'Taux']}
              contentStyle={{
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(15,25,35,0.08)',
              }}
            />
            <Line
              type="monotone"
              dataKey="taux"
              stroke="#F5821F"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#F5821F' }}
              fill="url(#gradLine)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
