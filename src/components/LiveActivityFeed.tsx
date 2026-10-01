import React from 'react';
import { AgentTask } from '../lib/types';
import { StatusPill } from './StatusPill';
import { formatRelative } from '../lib/format';
import { Activity, Clock, Terminal } from 'lucide-react';

interface LiveActivityFeedProps {
  tasks: AgentTask[];
  onSelectTask: (task: AgentTask) => void;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ tasks, onSelectTask }) => {
  const recentTasks = tasks.slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0B230] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F0B230]" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#e6edf3] font-mono">
            LIVE ACTIVITY
          </h2>
        </div>
        <span className="text-[10px] font-mono text-[#8b98a8]">
          {recentTasks.length} recent
        </span>
      </div>

      {recentTasks.length === 0 ? (
        <div className="p-4 rounded-lg bg-[#161b22] border border-white/5 text-center text-xs text-[#8b98a8]">
          No agent activity recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {recentTasks.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTask(t)}
              className="p-3 rounded-lg bg-[#161b22] hover:bg-[#1c2333] border border-white/5 hover:border-[#F0B230]/30 transition-all cursor-pointer text-xs space-y-1.5"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectTask(t);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-[#FFBD59] font-semibold truncate">
                  {t.task_type}
                </span>
                <span className="font-mono text-[10px] text-[#8b98a8] shrink-0">
                  {formatRelative(t.completed_at || t.started_at || t.created_at)}
                </span>
              </div>

              <p className="text-[#e6edf3] font-sans line-clamp-2 leading-relaxed text-[11px]">
                {t.prompt}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-[#8b98a8]">
                  {t.assigned_agent || 'Coordinator'}
                </span>
                <StatusPill status={t.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
