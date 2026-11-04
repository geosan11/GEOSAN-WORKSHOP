import React from 'react';
import type { AgentCardModel, AgentCardStatus } from '../../lib/cockpitModel';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatRelative } from '../../lib/format';
import { GitBranch, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AgentCardProps {
  card: AgentCardModel;
  onClick: () => void;
  className?: string;
}

const statusBadgeVariant: Record<
  AgentCardStatus,
  'primary' | 'warning' | 'outline'
> = {
  running: 'primary',
  awaiting_approval: 'warning',
  queued: 'outline',
};

export const AgentCard: React.FC<AgentCardProps> = ({
  card,
  onClick,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.target !== e.currentTarget &&
      (e.target as HTMLElement).tagName === 'A'
    ) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Open task ${card.currentTask.title} for ${card.agent}`}
      className={cn(
        'group cursor-pointer select-none text-left transition-[border-color,background-color] duration-150',
        'border-border bg-card hover:border-(--border-strong) hover:bg-accent/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'flex flex-col justify-between p-4 py-4 gap-3 min-w-0',
        className
      )}
    >
      <div className="space-y-3 min-w-0">
        {/* Top row: Agent Name + Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
          <h3
            className="text-sm font-semibold text-foreground tracking-tight truncate min-w-0"
            title={card.agent}
          >
            {card.agent}
          </h3>
          <Badge variant={statusBadgeVariant[card.status]} className="shrink-0">
            {card.statusLabel}
          </Badge>
        </div>

        {/* Status Counts */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <span>{card.counts.running} running</span>
          <span>·</span>
          <span>{card.counts.awaiting_approval} awaiting</span>
          <span>·</span>
          <span>{card.counts.queued} queued</span>
        </div>

        {/* Current Task Title */}
        <div className="space-y-1 min-w-0">
          <p
            className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed break-words"
            title={card.currentTask.title}
          >
            {card.currentTask.title}
          </p>

          {/* Task Type, Branch, PR Link */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              {card.currentTask.task_type}
            </Badge>

            {card.currentTask.branch_name && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] flex items-center gap-1 max-w-[150px] min-w-0"
                title={card.currentTask.branch_name}
              >
                <GitBranch className="size-2.5 shrink-0" />
                <span className="truncate min-w-0">
                  {card.currentTask.branch_name}
                </span>
              </Badge>
            )}

            {card.currentTask.pr_url && (
              <a
                href={card.currentTask.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline shrink-0"
                aria-label={`Open PR for task ${card.currentTask.title}`}
              >
                <ExternalLink className="size-3" />
                <span>PR</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer: relative timing + optional last QA verdict */}
      <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
        <span>since {formatRelative(card.currentTask.sinceIso)}</span>

        {card.lastQa && (
          <div className="flex items-center gap-1 shrink-0">
            <span>QA</span>
            <Badge
              variant={
                card.lastQa.status === 'completed'
                  ? 'success'
                  : card.lastQa.status === 'failed'
                  ? 'destructive'
                  : 'outline'
              }
              className="text-[10px]"
            >
              {card.lastQa.status}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
