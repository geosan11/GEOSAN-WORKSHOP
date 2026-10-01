import React, { useState } from 'react';
import {
  AgentTask,
  AgentResult,
  ProjectRegistry,
  SubagentProgress,
  AgentTrace,
  TaskDependency,
  PromptVersion
} from '../types';
import {
  INITIAL_AGENT_TRACES,
  INITIAL_TASK_DEPENDENCIES,
  INITIAL_PROMPT_VERSIONS
} from '../data/initialData';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
  X,
  FileCode,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GitBranch,
  Terminal,
  Cpu,
  Activity,
  Workflow,
  History,
  Server
} from 'lucide-react';

interface AgentConsoleProps {
  tasks: AgentTask[];
  results: AgentResult[];
  projects: ProjectRegistry[];
  selectedTaskId: string | null;
  traces?: AgentTrace[];
  dependencies?: TaskDependency[];
  promptVersions?: PromptVersion[];
  onSelectTask: (taskId: string) => void;
  onApproveTask: (taskId: string) => void;
  onRejectTask: (taskId: string, reason: string) => void;
  onOpenNewTask: () => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  tasks,
  results,
  projects,
  selectedTaskId,
  traces = INITIAL_AGENT_TRACES,
  dependencies = INITIAL_TASK_DEPENDENCIES,
  promptVersions = INITIAL_PROMPT_VERSIONS,
  onSelectTask,
  onApproveTask,
  onRejectTask,
  onOpenNewTask
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
  const [showDiff, setShowDiff] = useState<boolean>(true);
  const [detailTab, setDetailTab] = useState<'steps' | 'traces' | 'dag' | 'prompt'>('steps');

  const selectedTask =
    tasks.find((t) => t.id === selectedTaskId) || tasks[0] || null;

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const taskResults = results
    .filter((r) => r.task_id === selectedTask?.id)
    .sort((a, b) => a.step_number - b.step_number);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-140px)]">
      {/* Left Column: Task Queue & Stream (4 cols on lg) */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Agent Task Queue</h2>
            <p className="text-xs text-slate-400">
              Autonomous orchestration bus & state machine
            </p>
          </div>
          <button
            onClick={onOpenNewTask}
            className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors flex items-center gap-1"
          >
            <Play className="w-3 h-3 fill-current" />
            Dispatch
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`flex-1 py-1 rounded transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilterStatus('awaiting_approval')}
            className={`flex-1 py-1 rounded transition-colors flex items-center justify-center gap-1 ${
              filterStatus === 'awaiting_approval'
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approvals
            {tasks.filter((t) => t.status === 'awaiting_approval').length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>
          <button
            onClick={() => setFilterStatus('running')}
            className={`flex-1 py-1 rounded transition-colors ${
              filterStatus === 'running'
                ? 'bg-slate-800 text-cyan-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Running
          </button>
          <button
            onClick={() => setFilterStatus('done')}
            className={`flex-1 py-1 rounded transition-colors ${
              filterStatus === 'done'
                ? 'bg-slate-800 text-emerald-300 font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Done
          </button>
        </div>

        {/* Task Cards List */}
        <div className="space-y-2.5 overflow-y-auto max-h-[750px] pr-1">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              No tasks match filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const proj = projectMap.get(task.project_id);
              const isSelected = selectedTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    onSelectTask(task.id);
                    setShowRejectInput(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/50 shadow-sm shadow-cyan-950'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span className="font-mono text-cyan-400">
                      {proj ? proj.name.split(' ')[0] : 'Project'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.status === 'awaiting_approval'
                            ? 'bg-amber-400 animate-pulse'
                            : task.status === 'running'
                            ? 'bg-cyan-400 animate-ping'
                            : task.status === 'done'
                            ? 'bg-emerald-400'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="capitalize font-mono">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">
                    {task.prompt}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span className="truncate max-w-[140px] text-slate-400">
                      {task.task_type}
                    </span>
                    <span>{task.model_used}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Live Task Execution, Plan & Approval Console (8 cols on lg) */}
      <div className="lg:col-span-8 flex flex-col space-y-5">
        {selectedTask ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
            {/* Task Banner & Metadata */}
            <div className="border-b border-slate-800 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mb-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-white font-sans font-medium">
                    {projectMap.get(selectedTask.project_id)?.name || 'Project'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400">{selectedTask.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedTask.task_type}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Model: {selectedTask.model_used}</span>
                </div>
              </div>

              <h1 className="text-xl font-bold text-white leading-snug">
                {selectedTask.prompt}
              </h1>
            </div>

            {/* Awaiting Approval Action Callout */}
            {selectedTask.status === 'awaiting_approval' && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Human-in-the-Loop Gate: Awaiting Operator Approval
                  </div>
                  <span className="text-xs font-mono text-amber-400/80">
                    Est. Tokens: {selectedTask.plan?.estimated_tokens.toLocaleString() ?? 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  The Antigravity coding agent has drafted a verified patch and run local tests.
                  Review the diff below and confirm to apply changes to workspace and trigger automated deployment.
                </p>

                {showRejectInput ? (
                  <div className="space-y-2 pt-2">
                    <input
                      type="text"
                      placeholder="Specify rejection reason or revision guidance..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowRejectInput(false)}
                        className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onRejectTask(selectedTask.id, rejectReason);
                          setShowRejectInput(false);
                          setRejectReason('');
                        }}
                        className="px-3 py-1 text-xs font-medium text-rose-300 bg-rose-950/80 border border-rose-800 rounded-lg hover:bg-rose-900"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => onApproveTask(selectedTask.id)}
                      className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      Approve & Apply Patch
                    </button>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject / Request Revision
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Agent Proposed Plan & Subagent Hierarchy */}
            {selectedTask.plan && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="uppercase tracking-wider">Plan & Architecture Blueprint</span>
                  <span>Affected Files: {selectedTask.plan.affected_files.length}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {selectedTask.plan.overview}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
                    {selectedTask.plan.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Parallel Subagents Fan-out (Reasoning 2: ADK Subagent spawning) */}
                  {selectedTask.subagents && selectedTask.subagents.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-xs uppercase font-mono text-slate-500 block">
                        Parallel Subagent Fan-out (A2A Protocol)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedTask.subagents.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  sub.status === 'completed'
                                    ? 'bg-emerald-400'
                                    : sub.status === 'running'
                                    ? 'bg-cyan-400 animate-ping'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="text-slate-300 capitalize">{sub.role}</span>
                            </div>
                            <span className="text-slate-500 tabular-nums">
                              {sub.tokens_used.toLocaleString()} tok
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabbed Inspector: Steps | Traces | DAG | Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailTab('steps')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      detailTab === 'steps'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Steps ({taskResults.length})
                  </button>
                  <button
                    onClick={() => setDetailTab('traces')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      detailTab === 'traces'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    Observability Traces ({traces.filter((t) => t.task_id === selectedTask.id).length || traces.length})
                  </button>
                  <button
                    onClick={() => setDetailTab('dag')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      detailTab === 'dag'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Workflow className="w-3.5 h-3.5 text-amber-400" />
                    Task DAG ({dependencies.length})
                  </button>
                  <button
                    onClick={() => setDetailTab('prompt')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      detailTab === 'prompt'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    Prompt Versions
                  </button>
                </div>
                <span className="hidden sm:inline text-xs text-slate-500 font-mono">
                  Migration 003–005
                </span>
              </div>

              {/* Tab 1: Execution Steps */}
              {detailTab === 'steps' && (
                <div>
                  {taskResults.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-mono">
                      Waiting for agent worker execution stream...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {taskResults.map((step) => (
                        <div
                          key={step.id}
                          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-medium">
                                Step {step.step_number} · {step.step_type.toUpperCase()}
                              </span>
                              <span className="text-slate-400">{step.model_used}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-400 tabular-nums">
                              <span>
                                {(step.tokens_input + step.tokens_output).toLocaleString()} tok
                              </span>
                              <span className="text-emerald-400">${step.cost_usd.toFixed(5)}</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 font-sans leading-relaxed">
                            {step.content}
                          </p>

                          {/* Code Diff if present */}
                          {step.diff && (
                            <div className="pt-2">
                              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                                <span className="flex items-center gap-1 text-slate-300">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                  Patch Diff
                                </span>
                                <button
                                  onClick={() => setShowDiff(!showDiff)}
                                  className="text-cyan-400 hover:underline"
                                >
                                  {showDiff ? 'Collapse Diff' : 'Expand Diff'}
                                </button>
                              </div>
                              {showDiff && (
                                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono overflow-x-auto text-slate-300 leading-relaxed max-h-60">
                                  {step.diff.split('\n').map((line, lIdx) => {
                                    const isAdded = line.startsWith('+');
                                    const isRemoved = line.startsWith('-');
                                    const isHeader = line.startsWith('@') || line.startsWith('---') || line.startsWith('+++');
                                    return (
                                      <div
                                        key={lIdx}
                                        className={`${
                                          isAdded
                                            ? 'text-emerald-400 bg-emerald-950/30'
                                            : isRemoved
                                            ? 'text-rose-400 bg-rose-950/30'
                                            : isHeader
                                            ? 'text-cyan-400 font-semibold'
                                            : 'text-slate-400'
                                        } px-1`}
                                      >
                                        {line}
                                      </div>
                                    );
                                  })}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Observability Traces (Migration 004) */}
              {detailTab === 'traces' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                    Granular agent execution telemetry recording tool invocations, server calls, token latency, and invariant verification verdicts.
                  </div>
                  {traces.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            tr.trace_type === 'mcp_tool_call'
                              ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                              : tr.trace_type === 'a2a_delegation'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                              : tr.trace_type === 'adk_call'
                              ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30'
                              : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {tr.trace_type.replace('_', ' ')}
                          </span>
                          <span className="text-white font-bold">{tr.tool_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{tr.duration_ms} ms</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span className="text-slate-500">Daemon / Host: {tr.server_name || 'local-mcp'}</span>
                        <span className="text-slate-500">{new Date(tr.created_at).toLocaleTimeString()}</span>
                      </div>

                      {tr.metadata && (
                        <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-300">
                          {Object.entries(tr.metadata).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between">
                              <span className="text-slate-500">{k}:</span>
                              <span className="text-cyan-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: DAG Dependencies (Migration 003) */}
              {detailTab === 'dag' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                    Directed Acyclic Graph dependencies guarantee that tasks run in strict topological order (e.g. Plan → Code → Test → Review → Deploy).
                  </div>
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <Workflow className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-white font-semibold">
                            Task <span className="text-cyan-400">{dep.task_id}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Depends on <span className="text-slate-200">{dep.depends_on_task_id}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] uppercase">
                        Condition: {dep.condition}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Prompt Versions (Migration 005) */}
              {detailTab === 'prompt' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                    Prompt versioning provides strict governance. Historical runs remain reproducible, and every agent role executes against an immutable active prompt version.
                  </div>
                  {promptVersions.map((pv) => (
                    <div
                      key={pv.id}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
                            {pv.agent_name} Agent v{pv.version}
                          </span>
                          {pv.active && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans">
                              <CheckCircle2 className="w-3 h-3" /> Active Production
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500">
                          {new Date(pv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono bg-slate-900/70 p-2.5 rounded border border-slate-800">
                        {pv.content}
                      </p>
                      {pv.notes && (
                        <div className="text-[11px] text-slate-400 font-sans italic">
                          Changelog: {pv.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Result Summary if Done */}
            {selectedTask.result && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Outcome Verified: {selectedTask.result.qa_verdict?.toUpperCase() || 'PASS'}
                </div>
                <p className="text-sm text-slate-300 font-sans leading-relaxed">
                  {selectedTask.result.summary}
                </p>
                {selectedTask.result.diff_summary && (
                  <div className="text-xs font-mono text-slate-400">
                    {selectedTask.result.diff_summary}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-500">
            Select a task from the queue to inspect execution details.
          </div>
        )}
      </div>
    </div>
  );
};
