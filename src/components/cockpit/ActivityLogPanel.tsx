import React from 'react';
import type {
  ActivityFeedModel,
  ActivityLogItem,
  ActivityLogTab,
} from '../../lib/cockpitModel';
import {
  filterActivityLogs,
  exportActivityLogsAsJson,
} from '../../lib/cockpitModel';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Activity,
  Download,
  Copy,
  Check,
  Code2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface ActivityLogPanelProps {
  feed: ActivityFeedModel;
  className?: string;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  feed,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState<ActivityLogTab>('all');
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const displayedItems = React.useMemo(() => {
    return filterActivityLogs(feed.items, activeTab);
  }, [feed.items, activeTab]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleExportJson = () => {
    try {
      const jsonStr = exportActivityLogsAsJson(feed.items);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cockpit-activity-log-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Activity log exported (secrets redacted)');
    } catch {
      toast.error('Failed to export activity log');
    }
  };

  return (
    <section className={cn('space-y-3 min-w-0 max-w-full', className)}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activity
          </h2>
          {feed.hasData && (
            <Badge
              variant="outline"
              className="font-mono text-[10px] max-w-full truncate"
            >
              {displayedItems.length}
              {feed.totalCount > feed.items.length
                ? ` of ${feed.totalCount} (capped at 200)`
                : ` / ${feed.totalCount}`}
            </Badge>
          )}
        </div>

        {feed.hasData && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-7 text-xs font-mono gap-1.5 shrink-0"
            aria-label="Export activity log as JSON with secrets redacted"
          >
            <Download className="size-3.5" />
            <span className="hidden xs:inline">Export</span> JSON
          </Button>
        )}
      </div>

      {/* Main Activity Card */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as ActivityLogTab)}
        className="w-full flex flex-col gap-0"
      >
        <Card className="bg-card border-border overflow-hidden flex flex-col min-w-0 max-w-full">
          {/* Tabs Filter Bar */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap bg-muted/20">
            <TabsList className="bg-muted/70 p-0.5 h-8 w-full sm:w-auto flex overflow-x-auto">
              <TabsTrigger
                value="all"
                className="text-xs font-mono py-1 px-2.5 flex-1 sm:flex-none"
              >
                ALL ({feed.counts.all})
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="text-xs font-mono py-1 px-2.5 flex-1 sm:flex-none"
              >
                ERRORS ({feed.counts.errors})
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="text-xs font-mono py-1 px-2.5 flex-1 sm:flex-none"
              >
                STATUS ({feed.counts.status})
              </TabsTrigger>
              <TabsTrigger
                value="agent"
                className="text-xs font-mono py-1 px-2.5 flex-1 sm:flex-none"
              >
                AGENT ({feed.counts.agent})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content Area */}
          <CardContent className="p-0 min-w-0 max-w-full">
            {(['all', 'errors', 'status', 'agent'] as const).map((tab) => {
              const tabItems = filterActivityLogs(feed.items, tab);
              return (
                <TabsContent
                  key={tab}
                  value={tab}
                  className="p-0 min-w-0 max-w-full m-0 focus-visible:outline-none"
                >
                  {!feed.hasData ? (
                    <div className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="size-8 text-muted-foreground" />
                        <p className="text-xs font-medium text-foreground">
                          {feed.emptyState || 'No activity recorded yet'}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Dispatched instructions, task state changes, and supervisor events will stream here.
                        </p>
                      </div>
                    </div>
                  ) : tabItems.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                      No logs match the current filter &quot;{tab.toUpperCase()}&quot;.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                      {tabItems.map((item) => {
                        const isExpanded = expandedIds.has(item.id);
                        const hasDetails = Boolean(item.diff || item.payload);

                        const handleKeyDown = (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpand(item.id);
                          }
                        };

                        return (
                          <div
                            key={item.id}
                            className="transition-colors hover:bg-muted/30"
                          >
                            {/* Collapsed 36px (h-9) row */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleExpand(item.id)}
                              onKeyDown={handleKeyDown}
                              aria-expanded={isExpanded}
                              aria-controls={`activity-payload-${item.id}`}
                              className={cn(
                                'min-h-9 py-2 px-3 flex items-center justify-between gap-2.5 text-xs select-none cursor-pointer',
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:bg-muted/40'
                              )}
                            >
                              {/* Left side: timestamp, agent, action/level, message */}
                              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                                  {item.timestamp}
                                </span>

                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted border border-border text-foreground font-medium shrink-0 max-w-[120px] truncate">
                                  {item.agent}
                                </span>

                                <Badge
                                  variant={
                                    item.level === 'error'
                                      ? 'destructive'
                                      : item.level === 'warn'
                                      ? 'warning'
                                      : 'outline'
                                  }
                                  className="font-mono text-[9px] uppercase px-1 py-0 shrink-0 hidden xs:inline-flex"
                                >
                                  {item.actionType}
                                </Badge>

                                <p
                                  className="text-xs text-foreground truncate min-w-0 flex-1"
                                  title={item.message}
                                >
                                  {item.message}
                                </p>
                              </div>

                              {/* Right side: diff indicator, expand chevron */}
                              <div className="flex items-center gap-2 shrink-0">
                                {item.diff && (
                                  <span className="text-[10px] font-mono text-primary flex items-center gap-1 shrink-0">
                                    <Code2 className="size-3" />
                                    <span className="hidden sm:inline">Diff</span>
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Expandable Payload & Diff Block */}
                            {isExpanded && (
                              <div
                                id={`activity-payload-${item.id}`}
                                className="p-3 border-t border-border bg-muted/20 space-y-3 animate-in fade-in duration-150"
                              >
                                {item.diff ? (
                                  <div className="space-y-2 min-w-0">
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                      <span className="font-mono uppercase tracking-wider font-semibold">
                                        Diff View:
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(item.id, item.diff!);
                                        }}
                                        className="h-6 w-20 text-[10px] font-mono gap-1 shrink-0"
                                      >
                                        {copiedId === item.id ? (
                                          <>
                                            <Check className="size-3 text-emerald-500" />
                                            <span className="text-emerald-500">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="size-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <pre className="p-3 rounded-lg bg-background border border-border text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed whitespace-pre">
                                      {item.diff.split('\n').map((line, idx) => {
                                        const isAdd = line.startsWith('+');
                                        const isDel = line.startsWith('-');
                                        return (
                                          <div
                                            key={idx}
                                            className={cn(
                                              isAdd && 'text-emerald-600 dark:text-emerald-400 font-medium',
                                              isDel && 'text-rose-600 dark:text-rose-400 font-medium',
                                              !isAdd && !isDel && 'text-muted-foreground'
                                            )}
                                          >
                                            {line}
                                          </div>
                                        );
                                      })}
                                    </pre>
                                  </div>
                                ) : null}

                                {item.payload && !item.diff ? (
                                  <div className="space-y-2 min-w-0">
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                      <span className="font-mono uppercase tracking-wider font-semibold">
                                        Structured Payload (JSONB):
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(
                                            item.id,
                                            JSON.stringify(item.payload, null, 2)
                                          );
                                        }}
                                        className="h-6 w-20 text-[10px] font-mono gap-1 shrink-0"
                                      >
                                        {copiedId === item.id ? (
                                          <>
                                            <Check className="size-3 text-emerald-500" />
                                            <span className="text-emerald-500">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="size-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                    <pre className="p-3 rounded-lg bg-background border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-60 leading-relaxed whitespace-pre">
                                      {JSON.stringify(item.payload, null, 2)}
                                    </pre>
                                  </div>
                                ) : null}

                                {!hasDetails && (
                                  <div className="text-[11px] font-mono text-muted-foreground space-y-1">
                                    <div>ID: {item.id}</div>
                                    <div>Source: {item.source}</div>
                                    <div>Action Type: {item.actionType}</div>
                                    <div>Timestamp: {item.timestampIso || item.timestamp}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </CardContent>
        </Card>
      </Tabs>
    </section>
  );
};
