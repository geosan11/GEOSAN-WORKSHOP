import React, { useEffect, useState, useRef } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useChat } from '../hooks/useChat';
import { AgentTask, Project } from '../lib/types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { LoadingState } from './LoadingState';
import { TaskWorkspace } from './session/TaskWorkspace';
import { PlanApproval } from './PlanApproval';
import {
  Bot,
  Sparkles,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface ProjectChatTabProps {
  project: Project;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({ project }) => {
  const { tasks, createTask, refetch: refetchTasks, approveTask, rejectTask } = useTasks(project.id);
  const { conversation, messages, loading, sendMessage } = useChat(project.id);

  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if any plan has been approved for this project
  const approvedTask = tasks.find(
    (t) =>
      t.project_id === project.id &&
      (t.status === 'queued' || t.status === 'running' || t.status === 'done')
  );
  const agentDisabled = !approvedTask;

  // Auto-scroll on new message in Ask mode
  useEffect(() => {
    if (scrollRef.current && mode === 'ask') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending, mode]);

  const handleSendMessage = async (text: string, sendMode: 'ask' | 'agent', waitForApproval: boolean) => {
    if (!conversation) return;
    setSending(true);

    try {
      if (sendMode === 'ask') {
        // "Ask creates or updates a PLAN task with status proposed. It does not enqueue a build."
        await createTask({
          org_id: project.org_id,
          project_id: project.id,
          task_type: 'PLAN',
          prompt: text,
        });

        // Send user message
        await sendMessage(text);
      } else {
        // Agent steer message
        await sendMessage(`[Agent Directive]: ${text}`);
      }
    } finally {
      setSending(false);
    }
  };

  const handleApprovePlan = async (taskId: string) => {
    await approveTask(taskId);
    await refetchTasks();
    // Auto-switch to Agent mode once a plan is approved
    setMode('agent');
  };

  if (loading && !conversation) {
    return (
      <div className="p-6">
        <LoadingState type="lines" count={4} />
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden flex flex-col min-h-[640px] shadow-xl">
      {/* Chat Sub-header with Ask | Agent Mode Switcher */}
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

        {/* Mode Segmented Control in Header */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161b22] border border-white/10 font-mono text-xs">
          <button
            type="button"
            onClick={() => setMode('ask')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              mode === 'ask'
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
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              mode === 'agent'
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

      {/* ── AGENT MODE: Shows TaskWorkspace from Increment 1 ── */}
      {mode === 'agent' && (
        <div className="p-4">
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

      {/* ── ASK MODE: Message History Area + Plan Cards + Composer ── */}
      {mode === 'ask' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#1c2333] flex items-center justify-center text-[#F0B230] mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-[#e6edf3]">
                  Start conversation with {project.name}'s Project Agent
                </h4>
                <p className="text-[11px] text-[#8b98a8] max-w-sm leading-relaxed">
                  In <strong>Ask</strong> mode, ask about recent tasks, open regression findings, spend, or brainstorm an improvement. The agent formulates a plan card with numbered steps awaiting your approval.
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
                      onProposedTaskResolved={() => {}}
                    />

                    {/* If message has an awaiting_approval task, show PlanApproval directly */}
                    {proposedTask && proposedTask.status === 'awaiting_approval' && (
                      <div className="ml-8">
                        <PlanApproval
                          task={proposedTask}
                          onApprove={handleApprovePlan}
                          onReject={rejectTask}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8] p-2">
                <span className="w-2 h-2 rounded-full bg-[#F0B230] animate-ping" />
                <span>ProjectChatAgent is formulating architectural proposal...</span>
              </div>
            )}
          </div>

          {/* Composer at Bottom */}
          <ChatComposer
            onSend={handleSendMessage}
            disabled={sending}
            mode={mode}
            onModeChange={setMode}
            agentDisabled={agentDisabled}
          />
        </>
      )}
    </div>
  );
};
