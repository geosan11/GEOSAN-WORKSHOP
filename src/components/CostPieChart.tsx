import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCost } from '../lib/format';

interface CostPieChartProps {
  byProvider: Record<string, number>;
}

const PROVIDER_COLORS: Record<string, string> = {
  google: '#0873B7',
  anthropic: '#F0B230',
  xai: '#16A34A',
  openai: '#9333EA',
  local: '#8b98a8'
};

export const CostPieChart: React.FC<CostPieChartProps> = ({ byProvider }) => {
  const data = Object.entries(byProvider)
    .filter(([_, cost]) => cost > 0)
    .map(([provider, cost]) => ({
      name: provider.toUpperCase(),
      value: Number(cost.toFixed(4)),
      color: PROVIDER_COLORS[provider.toLowerCase()] || '#F0B230'
    }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#8b98a8]">
        No cost events recorded.
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0];
                return (
                  <div className="p-2 rounded-lg bg-[#161b22] border border-white/10 text-xs font-mono shadow-xl">
                    <span className="text-[#8b98a8] block text-[10px]">{item.name}</span>
                    <span className="text-[#FFBD59] font-bold">{formatCost(Number(item.value))}</span>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono mt-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-[#8b98a8]">{d.name}</span>
            <span className="text-[#e6edf3] font-semibold">{formatCost(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
