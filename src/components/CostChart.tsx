import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { DailySpendPoint } from '../lib/cost';
import { formatCost } from '../lib/format';

interface CostChartProps {
  data: DailySpendPoint[];
}

export const CostChart: React.FC<CostChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis
            dataKey="date"
            stroke="#8b98a8"
            fontSize={10}
            tickLine={false}
            fontFamily="JetBrains Mono"
          />
          <YAxis
            stroke="#8b98a8"
            fontSize={10}
            tickLine={false}
            fontFamily="JetBrains Mono"
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as DailySpendPoint;
                return (
                  <div className="p-2.5 rounded-lg bg-[#161b22] border border-white/10 text-xs font-mono shadow-xl">
                    <span className="text-[#8b98a8] block text-[10px]">{label}</span>
                    <span className="text-[#FFBD59] font-bold block text-sm">
                      {formatCost(item.cost)}
                    </span>
                    <span className="text-[#8b98a8] text-[10px]">
                      {item.tokens.toLocaleString()} tokens
                    </span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#F0B230"
            strokeWidth={2}
            dot={{ fill: '#F0B230', r: 3 }}
            activeDot={{ r: 5, fill: '#FFBD59' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
