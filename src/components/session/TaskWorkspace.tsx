import React, { useState, useEffect, useRef } from 'react';
import { AgentTask, Project, QAFinding, TaskStatus } from '../../lib/types';
import { useTasks } from '../../hooks/useTasks';
import { useQA } from '../../hooks/useQA';
import { useProjects } from '../../hooks/useProjects';
import { useNavigation } from '../../lib/navigation';
import { SeverityBadge } from '../SeverityBadge';
import { PlanApproval } from '../PlanApproval';
import { formatRelative, formatCost } from '../../lib/format';
import { getDesignBrief } from '../../lib/designBrief';
import { VERTICAL_KITS } from '../../data/verticalKits';
import {
  DEMO_WORKLOG_RUNNING,
  DEMO_WORKLOG_APPROVAL,
  DEMO_SESSION_MESSAGES,
  DEMO_SESSION_DIFFS,
  DEMO_SESSION_QA_FINDINGS,
  WorklogItem,
  SessionMessage,
  SessionDiffFile,
  SessionPlanStep
} from '../../data/sessionFixtures';
import {
  Terminal,
  FileCode,
  ShieldCheck,
  Activity,
  Send,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  FileDiff,
  CornerDownRight,
  Info
} from 'lucide-react';

interface TaskWorkspaceProps {
  taskId?: string;
  project: Project;
  onBack?: () => void;
}

type WorkspaceTab = 'progress' | 'shell' | 'diff' | 'qa';

/**
 * Maps task status to Devin-style operator labels
 */
export function getMappedStatusLabel(status: TaskStatus, prUrl?: string | null): {
  label: string;
  color: string;
  badgeClass: string;
} {
  if (status === 'awaiting_approval') {
    return {
      label: 'Approve plan',
      color: 'text-amber-400',
      badgeClass: 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
    };
  }
  if (status === 'running') {
    return {
      label: 'Working',
      color: 'text-[#FFBD59]',
      badgeClass: 'bg-[#F0B230]/20 text-[#FFBD59] border border-[#F0B230]/50'
    };
  }
  if (status === 'blocked') {
    return {
      label: 'Blocked',
      color: 'text-red-400',
      badgeClass: 'bg-red-950/60 text-red-400 border border-red-500/40'
    };
  }
  if (status === 'done' && prUrl) {
    return {
      label: 'PR ready',
      color: 'text-emerald-400',
      badgeClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
    };
  }
  if (status === 'done') {
    return {
      label: 'Done',
      color: 'text-emerald-400',
      badgeClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
    };
  }
  if (status === 'queued') {
    return {
      label: 'Queued',
      color: 'text-cyan-400',
      badgeClass: 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/40'
    };
  }
  if (status === 'proposed') {
    return {
      label: 'Proposed',
      color: 'text-purple-400',
      badgeClass: 'bg-purple-950/60 text-purple-400 border border-purple-500/40'
    };
  }
  if (status === 'failed') {
    return {
      label: 'Failed',
      color: 'text-red-400',
      badgeClass: 'bg-red-950/60 text-red-400 border border-red-500/40'
    };
  }
  return {
    label: 'Cancelled',
    color: 'text-[#8b98a8]',
    badgeClass: 'bg-white/5 text-[#8b98a8] border border-white/10'
  };
}

export const TaskWorkspace: React.FC<TaskWorkspaceProps> = ({ taskId, project, onBack }) => {
  const { tasks, approveTask, rejectTask } = useTasks();
  const { qaFindings } = useQA(project.id);
  const { navigate } = useNavigation();

  // Find active task or default to first project task / running fixture
  const currentTask =
    tasks.find((t) => t.id === taskId) ||
    tasks.find((t) => t.project_id === project.id && t.status === 'running') ||
    tasks.find((t) => t.project_id === project.id && t.status === 'awaiting_approval') ||
    tasks.find((t) => t.project_id === project.id) ||
    DEMO_WORKLOG_RUNNING[0]
      ? {
          id: 'task-session-running-01',
          org_id: project.org_id,
          project_id: project.id,
          task_type: 'BUILD_FEATURE',
          prompt: 'Implement bilateral netting engine for Kano Hub settlement\nEnsure strict integer arithmetic for kobo precision and generate verifiable settlement receipts.',
          status: 'running',
          assigned_agent: 'FullStackAgent',
          plan: { summary: 'Bilateral netting engine with atomic transaction' },
          result: { changed_files: ['src/settlement/bilateralNetting.ts', 'src/api/routes/settle.ts', 'test/settlementNetting.spec.ts'] },
          branch_name: 'feat/kano-netting-engine',
          pr_url: null,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: null,
          parent_task_id: null
        } as AgentTask
      : (tasks[0] as AgentTask);

  const activeTaskId = currentTask?.id || 'task-session-running-01';

  // Workspace active tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('progress');

  // Worklog state (seeded from fixtures or dynamic)
  const initialWorklog =
    activeTaskId === 'task-session-approval-02'
      ? DEMO_WORKLOG_APPROVAL
      : DEMO_WORKLOG_RUNNING;
  const [worklog, setWorklog] = useState<WorklogItem[]>(initialWorklog);
  const [selectedWorklogId, setSelectedWorklogId] = useState<string | null>(initialWorklog[0]?.id || null);

  // Thread messages
  const initialMessages =
    DEMO_SESSION_MESSAGES[activeTaskId] || [
      {
        id: `msg-${activeTaskId}-1`,
        taskId: activeTaskId,
        role: 'user',
        author: 'Operator',
        timestamp: new Date().toLocaleTimeString(),
        text: currentTask?.prompt || 'Run task'
      },
      {
        id: `msg-${activeTaskId}-2`,
        taskId: activeTaskId,
        role: 'agent',
        author: currentTask?.assigned_agent || 'CoordinatorAgent',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Analyzing codebase and formulating execution plan.',
        isPlan: true,
        planSteps: [
          { number: 1, text: 'Analyze file dependencies and database invariants', status: 'done' },
          { number: 2, text: 'Generate idempotent code mutations and test coverage', status: 'running' },
          { number: 3, text: 'Run deterministic linter and security assertions', status: 'pending' },
          { number: 4, text: 'Push branch and open review pull request', status: 'pending' }
        ]
      }
    ];

  const [messages, setMessages] = useState<SessionMessage[]>(initialMessages);
  const [steerInput, setSteerInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Diffs for this task
  const diffFiles: SessionDiffFile[] =
    DEMO_SESSION_DIFFS[activeTaskId] || [
      {
        path: 'src/settlement/bilateralNetting.ts',
        status: 'added',
        additions: 38,
        deletions: 0,
        before: '// (New file)',
        after: `export interface NettingResult {\n  grossKobo: bigint;\n  netKobo: bigint;\n  feeKobo: bigint;\n}\n\nexport function calculateBilateralNetting() {\n  // Integer micro-kobo precision\n}`
      }
    ];
  const [selectedDiffPath, setSelectedDiffPath] = useState<string>(diffFiles[0]?.path || '');

  // QA findings for this task
  const taskQAFindings: QAFinding[] =
    DEMO_SESSION_QA_FINDINGS[activeTaskId] ||
    qaFindings.filter((f) => f.run_id === currentTask?.id) ||
    [];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Steer agent handler (must NOT cancel task!)
  const handleSendSteer = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!steerInput.trim()) return;

    const newMsg: SessionMessage = {
      id: `steer-${Date.now()}`,
      taskId: activeTaskId,
      role: 'user',
      author: 'Operator',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: steerInput.trim()
    };

    const newWorklog: WorklogItem = {
      id: `wl-steer-${Date.now()}`,
      taskId: activeTaskId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'plan',
      summary: `Operator steered agent: "${steerInput.trim().slice(0, 60)}${steerInput.length > 60 ? '...' : ''}"`,
      payload: {
        notes: steerInput.trim()
      }
    };

    setMessages((prev) => [...prev, newMsg]);
    setWorklog((prev) => [...prev, newWorklog]);
    setSelectedWorklogId(newWorklog.id);
    setSteerInput('');

    // Agent response simulation
    setTimeout(() => {
      const ackMsg: SessionMessage = {
        id: `agent-ack-${Date.now()}`,
        taskId: activeTaskId,
        role: 'agent',
        author: currentTask?.assigned_agent || 'CoordinatorAgent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        text: `Acknowledged operator guidance: "${newMsg.text}". Integrating instruction into running worklog without interrupting deterministic execution.`
      };
      setMessages((prev) => [...prev, ackMsg]);
    }, 800);
  };

  const statusMeta = getMappedStatusLabel(currentTask.status, currentTask.pr_url);
  const selectedWorklog = worklog.find((w) => w.id === selectedWorklogId);
  const shellEvents = worklog.filter((w) => w.type === 'shell');

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* ── TOP CONTROL & META BAR ── */}
      <div className="p-4 rounded-2xl bg-[#161b22] border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8b98a8] hover:text-[#e6edf3] transition-colors"
              title="Return to tasks list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b98a8]">
              <span className="text-[#FFBD59] font-bold">{project.name}</span>
              <span>·</span>
              <span>{project.vertical}</span>
              <span>·</span>
              <span className="text-[#e6edf3]">{currentTask.id}</span>
            </div>
            <h1 className="text-sm md:text-base font-bold text-[#e6edf3] line-clamp-1">
              {currentTask.prompt.split('\n')[0]}
            </h1>

            {/* CodingAgent Design Context Bar */}
            {(() => {
              const brief = getDesignBrief(project.id, project.vertical);
              const kit = VERTICAL_KITS[brief.kit_id] || VERTICAL_KITS.ehi;
              return (
                <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-[#8b98a8] flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-white/5 text-[#FFBD59]">
                    KIT: {kit.verticalName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-white/5 text-cyan-300">
                    OBJECT: {brief.signature_object}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-white/5 text-emerald-400">
                    FIXTURE: {brief.approved_fixture_hash || 'PENDING APPROVAL'}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Status Chip, Agent & PR link */}
        <div className="flex items-center gap-2.5 font-mono text-xs flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </span>

          <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[#8b98a8] flex items-center gap-1.5 text-[11px]">
            <User className="w-3 h-3 text-[#F0B230]" />
            <span className="text-[#e6edf3]">{currentTask.assigned_agent || 'Coordinator'}</span>
          </div>

          {currentTask.branch_name && (
            <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[#8b98a8] flex items-center gap-1.5 text-[11px]">
              <GitBranch className="w-3 h-3 text-cyan-400" />
              <span className="text-cyan-300 truncate max-w-[140px]">{currentTask.branch_name}</span>
            </div>
          )}

          {currentTask.pr_url && (
            <a
              href={currentTask.pr_url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-[#084985]/30 hover:bg-[#084985]/50 border border-[#0873B7]/50 text-cyan-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
            >
              <span>PR Ready</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Plan Approval Widget if awaiting approval */}
      {currentTask.status === 'awaiting_approval' && (
        <PlanApproval task={currentTask} onApprove={approveTask} onReject={rejectTask} />
      )}

      {/* ── SPLIT WORKSPACE: LEFT 42% THREAD, RIGHT 58% WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ── LEFT PANE (42% on desktop -> 5 cols) ── */}
        <div className="lg:col-span-5 bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[700px]">
          {/* Thread Header */}
          <div className="px-4 py-3 border-b border-white/5 bg-[#0d1117]/80 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-[#8b98a8]">
              <Terminal className="w-3.5 h-3.5 text-[#F0B230]" />
              <span className="text-[#e6edf3] font-bold">Session Thread</span>
              <span>·</span>
              <span>{messages.length} events</span>
            </div>

            <span className="text-[10px] font-mono text-[#8b98a8]">
              {currentTask.status === 'running' ? (
                <span className="flex items-center gap-1.5 text-[#FFBD59]">
                  <span className="w-2 h-2 rounded-full bg-[#F0B230] animate-ping" />
                  Live session
                </span>
              ) : (
                'Synced'
              )}
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl border space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-[#1c2333]/70 border-white/10 text-[#e6edf3]'
                    : 'bg-[#0d1117] border-white/5 text-[#e6edf3]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#8b98a8]">
                  <span className="font-bold flex items-center gap-1.5">
                    {msg.role === 'user' ? (
                      <span className="text-[#F0B230]">OPERATOR</span>
                    ) : (
                      <span className="text-cyan-400">{msg.author}</span>
                    )}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <p className="font-sans text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Numbered Plan Steps with Status Dots (Devin pattern) */}
                {msg.isPlan && msg.planSteps && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2 font-mono text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#FFBD59] tracking-wider block">
                      Execution Plan Steps:
                    </span>
                    <div className="space-y-1.5">
                      {msg.planSteps.map((step) => {
                        let dotClass = 'bg-slate-500';
                        let textClass = 'text-[#8b98a8]';
                        if (step.status === 'done') {
                          dotClass = 'bg-emerald-400';
                          textClass = 'text-[#e6edf3]';
                        } else if (step.status === 'running') {
                          dotClass = 'bg-[#F0B230] animate-pulse';
                          textClass = 'text-[#FFBD59] font-bold';
                        } else if (step.status === 'failed') {
                          dotClass = 'bg-red-400';
                          textClass = 'text-red-400';
                        }

                        return (
                          <div
                            key={step.number}
                            className="p-2 rounded-lg bg-[#161b22] border border-white/5 flex items-start gap-2.5 text-[11px]"
                          >
                            <span className="font-bold text-[#8b98a8]">{step.number}.</span>
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
                            <div className="flex-1">
                              <span className={textClass}>{step.text}</span>
                              {step.notes && (
                                <span className="block text-[10px] text-[#8b98a8] mt-0.5 font-sans">
                                  {step.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Composer (spans left pane only) */}
          <form
            onSubmit={handleSendSteer}
            className="p-3 border-t border-white/5 bg-[#0d1117]/90 space-y-2"
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8b98a8]">
              <span>
                {currentTask.status === 'running'
                  ? 'Active steer channel (submitting appends event, does not cancel)'
                  : 'Operator input channel'}
              </span>
              <span className="text-[#FFBD59]">Enter to send</span>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={steerInput}
                onChange={(e) => setSteerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSteer();
                  }
                }}
                rows={2}
                placeholder={
                  currentTask.status === 'running'
                    ? 'Steer the agent. This does not stop the run.'
                    : 'Provide guidance or instruction to the agent...'
                }
                className="flex-1 bg-[#161b22] border border-white/10 rounded-xl p-2.5 text-xs text-[#e6edf3] font-mono focus:border-[#F0B230] focus:outline-none resize-none leading-relaxed"
              />

              <button
                type="submit"
                disabled={!steerInput.trim()}
                className="px-3 py-2.5 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-all flex items-center justify-center shrink-0 disabled:opacity-40"
                aria-label="Send steer instruction"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT PANE (58% on desktop -> 7 cols) ── */}
        <div className="lg:col-span-7 bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[700px]">
          {/* Workspace Tabs: Progress | Shell | Diff | QA */}
          <div className="px-4 py-2 border-b border-white/5 bg-[#0d1117]/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 font-mono text-xs">
              {(
                [
                  { id: 'progress', label: `Progress (${worklog.length})`, icon: Activity },
                  { id: 'shell', label: `Shell (${shellEvents.length})`, icon: Terminal },
                  { id: 'diff', label: `Diff (${diffFiles.length})`, icon: FileDiff },
                  { id: 'qa', label: `QA (${taskQAFindings.length})`, icon: ShieldCheck }
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#F0B230]/20 text-[#FFBD59] border border-[#F0B230]/40'
                        : 'text-[#8b98a8] hover:text-[#e6edf3] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] font-mono text-[#8b98a8] hidden sm:inline">
              Workspace Source of Truth
            </span>
          </div>

          {/* ── TAB 1: PROGRESS (Worklog of typed events) ── */}
          {activeTab === 'progress' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Chronological Event Rows */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                {worklog.map((item) => {
                  const isSelected = selectedWorklogId === item.id;

                  // Type Chip Color
                  let typeClass = 'bg-white/5 text-[#8b98a8] border-white/10';
                  if (item.type === 'plan') typeClass = 'bg-purple-950/60 text-purple-300 border-purple-500/40';
                  if (item.type === 'edit') typeClass = 'bg-blue-950/60 text-blue-300 border-blue-500/40';
                  if (item.type === 'shell') typeClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
                  if (item.type === 'qa') typeClass = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
                  if (item.type === 'approval') typeClass = 'bg-[#F0B230]/20 text-[#FFBD59] border-[#F0B230]/50';
                  if (item.type === 'pr') typeClass = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedWorklogId(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1c2333] border-[#F0B230] shadow-sm'
                          : 'bg-[#0d1117] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#8b98a8] shrink-0 font-bold">
                          {item.timestamp}
                        </span>

                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border shrink-0 ${typeClass}`}>
                          {item.type}
                        </span>

                        <span className="text-[#e6edf3] truncate flex-1 text-xs">
                          {item.summary}
                        </span>

                        <ChevronRight
                          className={`w-3.5 h-3.5 text-[#8b98a8] shrink-0 transition-transform ${
                            isSelected ? 'rotate-90 text-[#F0B230]' : ''
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Event Payload Detail View */}
              {selectedWorklog && (
                <div className="p-4 border-t border-white/5 bg-[#0d1117] max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[#8b98a8]">
                    <span className="font-bold text-[#FFBD59] uppercase">
                      Payload: {selectedWorklog.type} event ({selectedWorklog.timestamp})
                    </span>
                    <span>{selectedWorklog.summary}</span>
                  </div>

                  {/* Shell payload */}
                  {selectedWorklog.payload?.command && (
                    <div className="space-y-1">
                      <div className="p-2 rounded bg-[#161b22] text-[#FFBD59] text-[11px]">
                        $ {selectedWorklog.payload.command}
                      </div>
                      {selectedWorklog.payload.output && (
                        <pre className="p-2.5 rounded bg-[#161b22]/70 text-slate-300 text-[10px] whitespace-pre-wrap overflow-x-auto">
                          {selectedWorklog.payload.output}
                        </pre>
                      )}
                      <p className="text-[10px] text-[#8b98a8] italic">
                        Read-only. Git, lint, and replay run on the shell and do not spend the model budget.
                      </p>
                    </div>
                  )}

                  {/* Edit Diff payload */}
                  {selectedWorklog.payload?.diff && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#8b98a8]">File: {selectedWorklog.payload.filePath}</span>
                      <pre className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[10px] whitespace-pre-wrap overflow-x-auto">
                        {selectedWorklog.payload.diff.after}
                      </pre>
                    </div>
                  )}

                  {/* Steps payload */}
                  {selectedWorklog.payload?.steps && (
                    <div className="space-y-1">
                      {selectedWorklog.payload.steps.map((st) => (
                        <div key={st.number} className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span className="text-[#8b98a8]">{st.number}.</span>
                          <span>{st.text}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-[#FFBD59]">
                            {st.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* QA Finding payload */}
                  {selectedWorklog.payload?.finding && (
                    <div className="p-3 rounded-lg bg-[#161b22] border border-white/5 space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={selectedWorklog.payload.finding.severity} />
                        <span className="font-bold text-[#e6edf3]">
                          {selectedWorklog.payload.finding.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8b98a8] font-sans">
                        {selectedWorklog.payload.finding.description}
                      </p>
                    </div>
                  )}

                  {/* Notes payload */}
                  {selectedWorklog.payload?.notes && (
                    <p className="text-slate-300 font-sans text-xs">
                      {selectedWorklog.payload.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: SHELL (Read-only terminal view) ── */}
          {activeTab === 'shell' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className="text-[11px] font-sans">
                  Read-only. Git, lint, and replay run on the shell and do not spend the model budget.
                </span>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#0d1117] rounded-xl border border-white/10 p-4 space-y-4">
                {shellEvents.length === 0 ? (
                  <div className="text-center py-12 text-[#8b98a8]">
                    No shell commands executed for this task yet.
                  </div>
                ) : (
                  shellEvents.map((ev, idx) => (
                    <div key={ev.id} className="space-y-1.5 border-b border-white/5 pb-3 last:border-b-0">
                      <div className="flex items-center justify-between text-[10px] text-[#8b98a8]">
                        <span>Command #{idx + 1}</span>
                        <span>{ev.timestamp}</span>
                      </div>
                      <div className="text-[#FFBD59] font-bold">$ {ev.payload?.command}</div>
                      {ev.payload?.output && (
                        <pre className="p-3 rounded-lg bg-[#161b22] text-slate-300 text-[11px] whitespace-pre-wrap overflow-x-auto font-mono">
                          {ev.payload.output}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: DIFF (Changed files from task.result) ── */}
          {activeTab === 'diff' && (
            <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3 font-mono text-xs">
              {/* File list header */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {diffFiles.map((df) => (
                  <button
                    key={df.path}
                    onClick={() => setSelectedDiffPath(df.path)}
                    className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedDiffPath === df.path
                        ? 'bg-[#1c2333] border-[#F0B230] text-[#FFBD59] font-bold'
                        : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:text-[#e6edf3]'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{df.path}</span>
                    <span className="text-[10px] text-emerald-400">+{df.additions}</span>
                    {df.deletions > 0 && <span className="text-[10px] text-red-400">-{df.deletions}</span>}
                  </button>
                ))}
              </div>

              {/* Diff Viewer */}
              {(() => {
                const activeDiff = diffFiles.find((d) => d.path === selectedDiffPath) || diffFiles[0];
                if (!activeDiff) {
                  return (
                    <div className="p-10 text-center text-[#8b98a8]">
                      No code modifications recorded for this task.
                    </div>
                  );
                }

                return (
                  <div className="flex-1 overflow-y-auto bg-[#0d1117] rounded-xl border border-white/10 flex flex-col">
                    <div className="px-4 py-2 border-b border-white/5 bg-[#161b22] flex items-center justify-between text-[11px] text-[#8b98a8]">
                      <span className="font-bold text-[#e6edf3]">{activeDiff.path}</span>
                      <span>
                        <span className="text-emerald-400 font-bold">+{activeDiff.additions}</span> /{' '}
                        <span className="text-red-400 font-bold">-{activeDiff.deletions}</span> lines
                      </span>
                    </div>

                    <div className="p-4 space-y-2 overflow-x-auto">
                      {activeDiff.before && activeDiff.before !== '// (New file)' && (
                        <div className="p-3 rounded bg-red-950/30 border border-red-500/20 text-red-300 whitespace-pre-wrap">
                          {activeDiff.before}
                        </div>
                      )}
                      <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 whitespace-pre-wrap">
                        {activeDiff.after}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TAB 4: QA (Proof surface & findings) ── */}
          {activeTab === 'qa' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[#8b98a8] font-bold uppercase text-[11px]">
                  QA Test Gate Proof Surface ({taskQAFindings.length} findings)
                </span>
                <span className="text-[10px] text-emerald-400">Zero Regressions Required</span>
              </div>

              {/* Design Contract QA Check */}
              {(() => {
                const brief = getDesignBrief(project.id, project.vertical);
                const isApproved = brief.status === 'approved' && Boolean(brief.approved_fixture_hash);
                return (
                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isApproved ? 'bg-[#0d1117] border-emerald-500/30' : 'bg-red-950/20 border-red-500/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#e6edf3] flex items-center gap-1.5">
                        {isApproved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        Design Check: Signature Object Above Fold
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        isApproved
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : 'bg-red-950 text-red-300 border-red-500/40'
                      }`}>
                        {isApproved ? 'VERIFIED: ' + brief.approved_fixture_hash : 'BLOCKER: DESIGN UNAPPROVED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8b98a8]">
                      Asserts golden screen route strictly renders signature object (<code className="text-[#FFBD59]">{brief.signature_object}</code>) above the fold with zero generic marketing cards.
                    </p>
                  </div>
                );
              })()}

              {taskQAFindings.length === 0 ? (
                <div className="p-10 text-center text-[#8b98a8]">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  <p className="font-bold text-[#e6edf3]">All QA Invariant Gates Passed</p>
                  <p className="text-[11px] mt-1">
                    Autonomous DOM crawl and contract testing passed with 0 regression findings.
                  </p>
                </div>
              ) : (
                taskQAFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-xl bg-[#0d1117] border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} />
                        <span className="font-bold text-[#e6edf3] text-xs">{finding.title}</span>
                      </div>
                      <span className="text-[10px] text-[#8b98a8] uppercase px-2 py-0.5 rounded bg-white/5">
                        {finding.status}
                      </span>
                    </div>

                    {finding.description && (
                      <p className="text-slate-300 font-sans text-xs leading-relaxed">
                        {finding.description}
                      </p>
                    )}

                    {finding.component && (
                      <div className="text-[10px] text-[#8b98a8]">
                        Component: <span className="text-cyan-300">{finding.component}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
