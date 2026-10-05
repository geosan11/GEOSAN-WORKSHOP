import React, { useState, useMemo } from 'react';
import { useQA } from '../hooks/useQA';
import { useProjects } from '../hooks/useProjects';
import { useNavigation } from '../lib/navigation';
import { QARun, QAFinding } from '../lib/types';
import { QAFindingRow } from '../components/QAFindingRow';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/ui';
import { formatDateTime, formatRelative } from '../lib/format';
import { ShieldCheck, Filter, Bug, CheckCircle2, AlertTriangle, X, Play, ArrowRight, Layers } from 'lucide-react';

export const QARunsScreen: React.FC = () => {
  const { navigate } = useNavigation();
  const { qaRuns, qaFindings, loading, error, refetch, resolveFinding } = useQA();
  const { projects } = useProjects();

  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [runTypeFilter, setRunTypeFilter] = useState<string>('all');
  const [selectedRun, setSelectedRun] = useState<QARun | null>(null);

  // Filtered QA Runs
  const filteredRuns = useMemo(() => {
    return qaRuns.filter((r) => {
      const matchPlatform = platformFilter === 'all' || r.target_platform === platformFilter;
      const matchType = runTypeFilter === 'all' || r.run_type === runTypeFilter;
      return matchPlatform && matchType;
    });
  }, [qaRuns, platformFilter, runTypeFilter]);

  // Findings for the selected run
  const activeFindings = useMemo(() => {
    if (!selectedRun) return [];
    return qaFindings.filter((f) => f.run_id === selectedRun.id);
  }, [selectedRun, qaFindings]);

  const handleCreateFixTask = (finding: QAFinding) => {
    // Navigate to AgentConsole with prompt pre-filled
    navigate({ kind: 'console' });
  };

  const handleResolveAll = async () => {
    for (const f of activeFindings) {
      if (f.status !== 'resolved') {
        await resolveFinding(f.id);
      }
    }
  };

  if (loading && qaRuns.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingState type="table" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <QueryError message="Failed to load autonomous QA runs. Retry?" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            <span>Autonomous Testing Vertical</span>
            <span>·</span>
            <span className="text-gold">agent-qa & mk-qa-master MCP</span>
          </>
        }
        title="Autonomous QA Test Runs & Regression Findings"
        actions={
          <button
            onClick={() => navigate({ kind: 'console' })}
            className="px-4 py-2 rounded-lg btn-gold text-xs font-bold transition-colors flex items-center gap-1.5 self-start shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Dispatch QA Run
          </button>
        }
      />

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-[#161b22] border border-white/5 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#8b98a8] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {/* Platform Filter */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-white/5">
            {['all', 'web', 'mobile', 'api'].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-2 py-0.5 rounded uppercase text-[10px] transition-colors ${platformFilter === p
                  ? 'bg-[#F0B230] text-[#0A1420] font-bold'
                  : 'text-[#8b98a8] hover:text-white'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Run Type Filter */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg border border-white/5">
            {['all', 'explore', 'security', 'diff', 'targeted'].map((t) => (
              <button
                key={t}
                onClick={() => setRunTypeFilter(t)}
                className={`px-2 py-0.5 rounded uppercase text-[10px] transition-colors ${runTypeFilter === t
                  ? 'bg-[#F0B230] text-[#0A1420] font-bold'
                  : 'text-[#8b98a8] hover:text-white'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] text-[#8b98a8]">
          Showing {filteredRuns.length} test run{filteredRuns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* QA Runs Table */}
      {filteredRuns.length === 0 ? (
        <EmptyState
          title="No QA Runs Match Filters"
          description="Adjust your platform or run type filter to view historical test runs."
          actionLabel="Reset Filters"
          onAction={() => {
            setPlatformFilter('all');
            setRunTypeFilter('all');
          }}
        />
      ) : (
        <div className="bg-[#161b22] border border-white/5 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0d1117] border-b border-white/5 text-[#8b98a8] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp (Lagos)</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Run Type & Engine</th>
                  <th className="py-3 px-4">Platform</th>
                  <th className="py-3 px-4">Role Simulated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRuns.map((run) => {
                  const proj = projects.find((p) => p.id === run.project_id);
                  return (
                    <tr
                      key={run.id}
                      onClick={() => setSelectedRun(run)}
                      className="hover:bg-[#1c2333] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-[#8b98a8] text-[11px]">
                        {formatDateTime(run.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#e6edf3]">
                        {proj?.name || run.project_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#FFBD59] font-bold uppercase block">{run.run_type}</span>
                        <span className="text-[#8b98a8] text-[10px] block truncate">{run.engine_used}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0d1117] border border-white/5 text-slate-300 uppercase">
                          {run.target_platform}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#8b98a8] text-[11px]">
                        {run.role_tested || 'guest'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${run.status === 'completed'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                            : run.status === 'running'
                              ? 'bg-[#F0B230]/20 text-[#FFBD59] border border-[#F0B230]/40 animate-pulse'
                              : 'bg-red-950/40 text-red-400 border border-red-500/30'
                            }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold tabular-nums ${run.findings_count > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                        >
                          {run.findings_count} {run.findings_count === 1 ? 'issue' : 'issues'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QA Run Findings Drawer */}
      {selectedRun && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl h-full bg-[#161b22] border-l border-white/10 flex flex-col justify-between shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4 sticky top-0 bg-[#161b22]/95 backdrop-blur-md z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#FFBD59] font-bold uppercase">{selectedRun.run_type} QA RUN</span>
                  <span>·</span>
                  <span className="text-[#8b98a8]">{selectedRun.id}</span>
                </div>
                <h3 className="text-base font-bold text-[#e6edf3]">
                  {selectedRun.target_url}
                </h3>
              </div>

              <button
                onClick={() => setSelectedRun(null)}
                className="p-1.5 rounded-lg text-[#8b98a8] hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close findings drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 space-y-5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8b98a8]">
                  FINDINGS ({activeFindings.length})
                </span>

                {activeFindings.length > 0 && (
                  <button
                    onClick={handleResolveAll}
                    className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark All Resolved
                  </button>
                )}
              </div>

              {activeFindings.length === 0 ? (
                <EmptyState
                  title="Zero Regressions Found"
                  description="All automated assertions and visual invariant checks passed cleanly on this test run."
                  icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                />
              ) : (
                <div className="space-y-4">
                  {activeFindings.map((finding) => (
                    <QAFindingRow
                      key={finding.id}
                      finding={finding}
                      onResolve={resolveFinding}
                      onCreateFixTask={handleCreateFixTask}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-white/10 bg-[#161b22] flex justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1c2333] hover:bg-white/10 text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
