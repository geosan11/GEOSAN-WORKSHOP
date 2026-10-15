import React, { useEffect, useState, useRef } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useChat } from '../hooks/useChat';
import { AgentTask, Project } from '../lib/types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { LoadingState } from './LoadingState';
import { TaskWorkspace } from './session/TaskWorkspace';
import { PlanApproval } from './PlanApproval';
import { AgentWorkingStream, WorkingStep } from './AgentWorkingStream';
import { AgentCompletionCard } from './AgentCompletionCard';
import { requestBudgetAdmit } from '../lib/budget';
import { useToast } from './Toast';
import {
  Bot,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface ProjectChatTabProps {
  project: Project;
}

interface CompletionState {
  prompt: string;
  task: AgentTask;
}

const ASK_STEPS: Array<Omit<WorkingStep, 'status'>> = [
  { id: 'admit', label: 'Checking weekly budget admission' },
  { id: 'context', label: 'Loading project invariants and open findings' },
  { id: 'plan', label: 'Drafting numbered plan with done_when gates' },
  { id: 'gate', label: 'Parking proposal for operator approval' },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({ project }) => {
  const { tasks, createTask, refetch: refetchTasks, approveTask, rejectTask } = useTasks(project.id);
  const { conversation, messages, loading, sendMessage } = useChat(project.id);
  const toast = useToast();

  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [sending, setSending] = useState(false);
  const [workingSteps, setWorkingSteps] = useState<WorkingStep[]>([]);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [budgetRevision, setBudgetRevision] = useState(0);
  const [activeAgentTaskId, setActiveAgentTaskId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const executableTasks = tasks.filter(
    (t) =>
      t.project_id === project.id &&
      (t.status === 'queued' || t.status === 'running' || t.status === 'done')
  );
  const approvedTask =
    executableTasks.find((t) => t.id === activeAgentTaskId) ||
    executableTasks.find((t) => t.task_type === 'PLAN') ||
    executableTasks[0];
  const agentDisabled = !approvedTask;

  const awaitingPlans = tasks.filter(
    (t) => t.project_id === project.id && t.status === 'awaiting_approval' && t.task_type === 'PLAN'
  );

  useEffect(() => {
    if (scrollRef.current && mode === 'ask') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending, mode, workingSteps, completion]);

  const runAskWorkingStream = async (holdForApproval: boolean): Promise<void> => {
    const labels = ASK_STEPS.map((step, index) =>
      index === ASK_STEPS.length - 1 && !holdForApproval
        ? { ...step, label: 'Auto-proceeding plan into the execution queue' }
        : step
    );

    setWorkingSteps(
      labels.map((step, index) => ({
        ...step,
        status: index === 0 ? 'active' : 'pending',
      }))
    );

    for (let i = 0; i < labels.length; i++) {
      await sleep(260);
      setWorkingSteps((prev) =>
        prev.map((step, index) => {
          if (index < i) return { ...step, status: 'done' };
          if (index === i) return { ...step, status: 'active' };
          return { ...step, status: 'pending' };
        })
      );
    }

    await sleep(180);
    setWorkingSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })));
  };

  const handleSendMessage = async (
    text: string,
    sendMode: 'ask' | 'agent',
    waitForApproval: boolean
  ) => {
    setSending(true);
    setCompletion(null);

    try {
      if (sendMode === 'ask') {
        setWorkingSteps([]);
        const streamPromise = runAskWorkingStream(waitForApproval);

        const admit = await requestBudgetAdmit(1, 0.0075);
        if (!admit.admitted) {
          toast.error(admit.reason || 'Budget admission refused');
          await streamPromise;
          return;
        }
        setBudgetRevision((n) => n + 1);

        const planSteps = [
          'Clarify goal from operator prompt',
          `Map required files and invariants for ${project.name}`,
          'Define done_when checks and approval gate',
        ];

        const status = waitForApproval ? 'awaiting_approval' : 'queued';
        const created = await createTask({
          org_id: project.org_id,
          project_id: project.id,
          task_type: 'PLAN',
          prompt: text,
          status,
          assigned_agent: 'ProjectChatAgent',
          plan: {
            summary: `Architectural proposal for: ${text}`,
            steps: planSteps,
          },
          goal: text,
          done_when: [
            'Operator has reviewed the numbered plan',
            'done_when gates are explicit and testable',
            'No build is enqueued before approval',
          ],
          constraints: [
            'Ask mode must not enqueue builds without approval',
            'Stay within weekly budget admission',
          ],
        });

        await sendMessage(text, { proposedTaskId: created.id });
        await streamPromise;
        setCompletion({ prompt: text, task: created });
        await refetchTasks();

        if (!waitForApproval) {
          setActiveAgentTaskId(created.id);
          setMode('agent');
        }
      } else {
        await sendMessage(`[Agent Directive]: ${text}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ask dispatch failed';
      toast.error(message);
    } finally {
      setSending(false);
      setWorkingSteps([]);
    }
  };

  const handleApprovePlan = async (taskId: string) => {
    await approveTask(taskId);
    setActiveAgentTaskId(taskId);
    await refetchTasks();
    setCompletion(null);
    setMode('agent');
  };

  if (loading && !conversation) {
    return (
      <div className="p-6">
        <LoadingState type="lines" count={4} />
      </div>
    );
  }

  const showChips = mode === 'ask'
    ? messages.length === 0 && !completion && !sending
    : true;

  return (
    <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[640px] shadow-xl">
      <div className="px-5 py-3.5 border-b border-white/5 bg-[#0d1117]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#084985]/30 border border-[#0873B7]/40 text-[#0873B7] flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#e6edf3] font-display">
                ProjectChatAgent ({project.name})
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono">
                mode="{mode}"
              </span>
            </div>
            <span className="text-[10px] text-[#8b98a8] font-mono block">
              {mode === 'ask'
                ? 'Ask Mode: Formulates proposals and plans. Does not enqueue builds without approval.'
                : 'Agent Mode: Interactive execution workspace for approved tasks.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161b22] border border-white/10 font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode('ask')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mode === 'ask'
                ? 'bg-[#1c2333] text-[#FFBD59] border border-[#F0B230]/40 shadow-sm'
                : 'text-[#8b98a8] hover:text-[#e6edf3]'
              }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#F0B230]" />
            <span>Ask</span>
          </button>

          <button
            type="button"
            disabled={agentDisabled}
            onClick={() => setMode('agent')}
            title={agentDisabled ? 'Agent mode requires an approved plan' : 'Open Agent workspace'}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mode === 'agent'
                ? 'bg-[#1c2333] text-cyan-300 border border-cyan-500/40 shadow-sm'
                : agentDisabled
                  ? 'text-[#8b98a8]/40 cursor-not-allowed'
                  : 'text-[#8b98a8] hover:text-[#e6edf3]'
              }`}
          >
            {agentDisabled ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
            <span>Agent</span>
            {agentDisabled && <span className="text-[9px] text-[#8b98a8]">Locked</span>}
          </button>
        </div>
      </div>

      {mode === 'agent' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {approvedTask ? (
            <TaskWorkspace taskId={approvedTask.id} project={project} />
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-3 font-mono">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
              <h3 className="text-sm font-bold text-[#e6edf3]">
                Agent Mode Requires an Approved Plan
              </h3>
              <p className="text-xs text-[#8b98a8] max-w-md font-sans">
                Autonomous builds and file modifications do not auto-proceed. Run in <strong>Ask</strong> mode to generate an architecture plan, then approve the plan with operator signoff.
              </p>
              <button
                onClick={() => setMode('ask')}
                className="px-4 py-2 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-colors flex items-center gap-1.5"
              >
                <span>Switch to Ask Mode</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'ask' && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !sending && !completion ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#1c2333] flex items-center justify-center text-[#F0B230] mb-2">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-[#e6edf3]">
                What would you like to inspect or plan for {project.name}?
              </h4>
              <p className="text-[11px] text-[#8b98a8] max-w-sm leading-relaxed">
                Pick a suggestion below or type freely. Ask mode formulates a plan card with numbered steps and holds for your approval — it does not enqueue a build.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const proposedTask = msg.proposed_task_id
                ? tasks.find((t) => t.id === msg.proposed_task_id) || null
                : null;

              return (
                <div key={msg.id} className="space-y-3">
                  <ChatMessageItem
                    message={msg}
                    proposedTask={proposedTask}
                    onProposedTaskResolved={() => { }}
                  />

                  {proposedTask && proposedTask.status === 'awaiting_approval' && (
                    <div className="ml-8">
                      <PlanApproval
                        task={proposedTask}
                        onApprove={handleApprovePlan}
                        onReject={async (taskId) => {
                          await rejectTask(taskId);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {awaitingPlans.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <p className="text-[10px] font-mono uppercase tracking-wide text-[#8b98a8]">
                Plans awaiting approval
              </p>
              {awaitingPlans
                .filter((task) => !messages.some((m) => m.proposed_task_id === task.id))
                .map((task) => (
                  <div key={task.id} className="ml-0 sm:ml-8">
                    <PlanApproval
                      task={task}
                      onApprove={handleApprovePlan}
                      onReject={async (taskId) => {
                        await rejectTask(taskId);
                      }}
                    />
                  </div>
                ))}
            </div>
          )}

          {sending && workingSteps.length > 0 && (
            <AgentWorkingStream steps={workingSteps} headline="ProjectChatAgent is working…" />
          )}

          {completion && !sending && (
            <AgentCompletionCard
              prompt={completion.prompt}
              task={completion.task}
              onFollowUp={(followUpText) => {
                void handleSendMessage(followUpText, 'ask', true);
              }}
            />
          )}
        </div>
      )}

      <ChatComposer
        onSend={handleSendMessage}
        disabled={sending || (mode === 'agent' && agentDisabled)}
        mode={mode}
        onModeChange={setMode}
        agentDisabled={agentDisabled}
        showChipGrid={showChips}
        showModeToggle={false}
        budgetRevision={budgetRevision}
      />
    </div>
  );
};
