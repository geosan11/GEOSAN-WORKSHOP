import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { TaskType, AgentTask } from '../lib/types';
import { StatusPill } from '../components/StatusPill';
import { PlanApproval } from '../components/PlanApproval';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { AgentSwarmWorkbench } from '../components/AgentSwarmWorkbench';
import { LoadingState } from '../components/LoadingState';
import { QueryError } from '../components/QueryError';
import { formatRelative, formatDateTime } from '../lib/format';
import { useToast } from '../components/Toast';
import {
  Terminal,
  Send,
  ArrowRight,
  Clock,
  User,
  Check,
  Layers,
  Sparkles,
  ShieldCheck,
  GitBranch,
  Cpu,
  Lock
} from 'lucide-react';
import { TaskImportance, getRecommendedModel } from '../lib/modelRouter';
import { ModelRouterIntelligence } from '../components/ModelRouterIntelligence';
import { FleetBoard } from '../components/FleetBoard';
import { useNavigation } from '../lib/navigation';
import { LayoutGrid, List } from 'lucide-react';

const TASK_TYPES: { value: TaskType; label: string; agent: string; desc: string }[] = [
  { value: 'BUILD_FEATURE', label: 'BUILD FEATURE', agent: 'CodingAgent + Reviewer', desc: 'Create code, tests, and open PR' },
  { value: 'FIX_BUG', label: 'FIX BUG', agent: 'CodingAgent', desc: 'Isolate error and open regression fix PR' },
  { value: 'QA_SECURITY', label: 'QA SECURITY', agent: 'QAAgent (OWASP)', desc: 'Verify RBAC and tenant RLS isolation' },
  { value: 'QA_EXPLORE', label: 'QA EXPLORE', agent: 'QAAgent (agent-qa)', desc: 'Autonomous DOM and mobile crawl' },
  { value: 'QA_TARGETED', label: 'QA TARGETED', agent: 'QAAgent (mk-qa-master)', desc: 'Test specific feature flow directly' },
  { value: 'DEPLOY', label: 'DEPLOY', agent: 'DeployAgent', desc: 'Deploy verified build to Vercel preview/prod' }
];

const PRESET_PROMPTS = [
  'Add automated PDF statement dispatch on month-end settlement closure',
  'Fix floating point rounding error on batch payroll payout reconciliation ledger',
  'Run full security RBAC crawl on customer routes and weighbridge webhooks',
  'Deploy production release after Schemathesis contract suite passes'
];

export const AgentConsoleScreen: React.FC = () => {
  const toast = useToast();
  const { navigate } = useNavigation();
  const { projects, loading: pLoading } = useProjects();
  const { tasks, loading: tLoading, error: tError, refetch: tRefetch, createTask, approveTask, rejectTask, cancelTask, retryTask } = useTasks();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>('BUILD_FEATURE');
  const [importance, setImportance] = useState<TaskImportance>('standard');
  const [autoRoute, setAutoRoute] = useState<boolean>(true);
  const [selectedModelId, setSelectedModelId] = useState<string>('deepseek-v3');
  const [promptText, setPromptText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const handleTaskTypeChange = (newType: TaskType) => {
    setTaskType(newType);
    if (autoRoute) {
      const rec = getRecommendedModel(newType, importance);
      setSelectedModelId(rec.modelId);
    }
  };

  // Set default project when loaded
  const currentProjectId = selectedProjectId || (projects[0]?.id ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !currentProjectId) return;

    const proj = projects.find((p) => p.id === currentProjectId);
    try {
      setSubmitting(true);
      const created = await createTask({
        org_id: proj?.org_id || 'org-ehi-global',
        project_id: currentProjectId,
        task_type: taskType,
        prompt: promptText.trim()
      });
      setPromptText('');
      toast.success(`Dispatched ${created.id} to CoordinatorAgent (${selectedModelId})`);
    } catch {
      toast.error('Failed to dispatch task');
    } finally {
      setSubmitting(false);
    }
  };

  const recentTasks = tasks.slice(0, 10);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8]">
          <Terminal className="w-3.5 h-3.5 text-[#F0B230]" />
          <span>Root Orchestrator Interface</span>
          <span>·</span>
          <span className="text-[#FFBD59]">ADK Multi-Agent Dispatcher</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#e6edf3]">
          Agent Console & Instruction Dispatch
        </h1>
        <p className="text-xs text-[#8b98a8]">
          Dispatch goals to CoordinatorAgent. Work will be planned, isolated in git worktrees, tested, and submitted for your approval before deploy.
        </p>
      </div>

      {/* Main 3-Step Instruction Dispatch Form (Inspired by Good Checkout UI/UX) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STEP 1: TARGET VERTICAL CONTAINER */}
        <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#F0B230] text-[#0A1420] font-bold text-xs flex items-center justify-center font-mono">
              1
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider font-mono">
                Select Target Vertical & Isolation Environment
              </h3>
              <p className="text-[11px] text-[#8b98a8]">
                Coordinator will fork a clean git worktree for the selected client project
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {projects.map((p) => {
              const isSelected = currentProjectId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#F0B230]/15 border-[#F0B230] shadow-sm shadow-[#F0B230]/10'
                      : 'bg-[#0d1117] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#e6edf3] line-clamp-1">{p.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-[10px] text-[#8b98a8] font-mono block line-clamp-1">{p.vertical}</span>
                  </div>
                  {isSelected && (
                    <span className="mt-2 text-[10px] font-mono text-[#FFBD59] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Target Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: SPECIALIST AGENT & TASK TYPE */}
        <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#F0B230] text-[#0A1420] font-bold text-xs flex items-center justify-center font-mono">
              2
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider font-mono">
                Choose Specialist Agent & Execution Mode
              </h3>
              <p className="text-[11px] text-[#8b98a8]">
                Determines LLM provider, prompt instructions, and tool capability access
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {TASK_TYPES.map((t) => {
              const isSelected = taskType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTaskTypeChange(t.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#F0B230]/15 border-[#F0B230] text-[#FFBD59] shadow-sm'
                      : 'bg-[#0d1117] border-white/5 text-[#8b98a8] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs block text-[#e6edf3]">{t.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#8b98a8]">
                      {t.agent.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8b98a8] line-clamp-1 mt-1 block">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: FOUNDATION MODEL & INTELLIGENT ROUTER */}
        <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#F0B230] text-[#0A1420] font-bold text-xs flex items-center justify-center font-mono">
              3
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider font-mono">
                Model Routing Intelligence & Criticality Matching
              </h3>
              <p className="text-[11px] text-[#8b98a8]">
                Match task type and criticality level with the optimal AI foundation model profile
              </p>
            </div>
          </div>

          <ModelRouterIntelligence
            taskType={taskType}
            selectedModelId={selectedModelId}
            importance={importance}
            onImportanceChange={setImportance}
            onModelSelect={setSelectedModelId}
            autoRoute={autoRoute}
            onToggleAutoRoute={setAutoRoute}
          />
        </div>

        {/* STEP 4: SPECIFICATION & GUARDRAILS */}
        <div className="p-5 rounded-2xl bg-[#161b22] border border-white/5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#F0B230] text-[#0A1420] font-bold text-xs flex items-center justify-center font-mono">
              4
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#e6edf3] uppercase tracking-wider font-mono">
                Natural Language Instruction & Guardrails
              </h3>
              <p className="text-[11px] text-[#8b98a8]">
                Describe what to build or fix with precision
              </p>
            </div>
          </div>

          {/* Preset Quick-Fill Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-[#8b98a8] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#F0B230]" /> Preset Examples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPromptText(p)}
                  className="px-2.5 py-1 rounded-lg bg-[#0d1117] hover:bg-[#1c2333] border border-white/5 hover:border-[#F0B230]/40 text-[#8b98a8] hover:text-[#e6edf3] text-[11px] font-mono transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-1.5">
            <textarea
              id="agent-prompt-input"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. Implement debt clearance badge and instant reconciliation receipt on customer transaction ledger"
              rows={4}
              required
              className="w-full bg-[#0d1117] border border-white/10 rounded-xl p-3.5 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230] leading-relaxed resize-none shadow-inner"
            />
          </div>

          {/* Guardrails Info + Dispatch CTA */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#8b98a8]">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Worktree Isolated
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Lock className="w-3.5 h-3.5" /> Sonnet 4 Critic Active
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || !promptText.trim()}
              className="px-6 py-3 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#F0B230]/20 disabled:opacity-50"
            >
              {submitting ? 'Dispatching to Coordinator…' : 'Dispatch to CoordinatorAgent'}
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </form>

      {/* Hardware-Accelerated Swarm Telemetry & Packet Transit */}
      <AgentSwarmWorkbench />

      {/* ── FLEET SESSIONS & TASKS STREAM (BOARD | LIST TOGGLE) ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#8b98a8] font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#F0B230]" />
              Fleet Tasks & Sessions
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#FFBD59]">
              {tasks.length} tasks
            </span>
          </div>

          {/* Board | List Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161b22] border border-white/10 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'board'
                  ? 'bg-[#1c2333] text-[#FFBD59] border border-[#F0B230]/40 shadow-sm'
                  : 'text-[#8b98a8] hover:text-[#e6edf3]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-[#1c2333] text-[#FFBD59] border border-[#F0B230]/40 shadow-sm'
                  : 'text-[#8b98a8] hover:text-[#e6edf3]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {viewMode === 'board' ? (
          <FleetBoard
            tasks={tasks}
            projects={projects}
            onSelectTask={(task) => {
              navigate({ kind: 'project', projectId: task.project_id, tab: 'session', taskId: task.id });
            }}
            onRefresh={tRefetch}
            isRefreshing={tLoading}
          />
        ) : (
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#161b22] border border-white/5 text-center text-xs text-[#8b98a8]">
                No instructions dispatched yet. Send your first instruction above.
              </div>
            ) : (
              recentTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3 hover:border-white/10 transition-all cursor-pointer text-xs shadow-sm"
                  onClick={() => {
                    navigate({ kind: 'project', projectId: t.project_id, tab: 'session', taskId: t.id });
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#8b98a8]">{t.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/5 text-[#e6edf3]">
                        {t.task_type}
                      </span>
                    </div>
                    <StatusPill status={t.status} />
                  </div>

                  <p className="text-[#e6edf3] font-mono line-clamp-2 text-xs">{t.prompt}</p>

                  {/* Plan Approval Widget directly in feed if awaiting approval */}
                  {t.status === 'awaiting_approval' && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <PlanApproval task={t} onApprove={approveTask} onReject={rejectTask} />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8b98a8] pt-1 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t.assigned_agent || 'Coordinator'}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelative(t.created_at)}
                      </span>
                    </div>

                    <span className="text-[#F0B230] hover:text-[#FFBD59] flex items-center gap-1 font-bold">
                      Open Session Workspace <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={approveTask}
        onReject={rejectTask}
        onCancel={cancelTask}
        onRetry={async (id) => {
          const newTask = await retryTask(id);
          setSelectedTask(newTask);
        }}
      />
    </div>
  );
};

