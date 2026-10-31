import React from 'react';
import { AgentTask } from '../lib/types';
import { Check, X, AlertCircle } from 'lucide-react';

interface TaskExecutionStepperProps {
  task: AgentTask;
}

interface StepDefinition {
  id: string;
  name: string;
  agent: string;
  description: string;
}

const PIPELINE_STEPS: StepDefinition[] = [
  {
    id: 'dispatch',
    name: 'Goal Dispatch & Routing',
    agent: 'CoordinatorAgent',
    description: 'Natural language instruction validated and routed to specialists.',
  },
  {
    id: 'isolation',
    name: 'Git Worktree Isolation',
    agent: 'Worktree Daemon',
    description: 'Isolated branch fork created. Main branch write lock enforced.',
  },
  {
    id: 'planning',
    name: 'Adversarial Plan Review',
    agent: 'ReviewAgent (Sonnet 4)',
    description: 'Diff audited against tenant RLS rules, schema invariants, and secrets.',
  },
  {
    id: 'approval',
    name: 'Operator Approval Gate',
    agent: 'Operator (Human)',
    description: 'Human-in-the-loop review of execution plan and estimated token burn.',
  },
  {
    id: 'execution',
    name: 'Code Synthesis & Local Tests',
    agent: 'CodingAgent (Gemini 3.5)',
    description: 'Implementation committed to worktree branch with unit tests.',
  },
  {
    id: 'qa',
    name: 'Autonomous QA Audit',
    agent: 'QAAgent (agent-qa)',
    description: 'API fuzzing and multi-role RBAC crawl executed.',
  },
  {
    id: 'pr_deploy',
    name: 'Pull Request & Verification',
    agent: 'DeployAgent',
    description: 'PR merged to main and preview deployment verified.',
  },
];

export const TaskExecutionStepper: React.FC<TaskExecutionStepperProps> = ({ task }) => {
  const getStepState = (index: number): 'completed' | 'active' | 'failed' | 'pending' => {
    const s = task.status;

    if (s === 'done') {
      return 'completed';
    }

    if (s === 'failed') {
      if (index < 4) return 'completed';
      if (index === 4) return 'failed';
      return 'pending';
    }

    if (s === 'cancelled') {
      if (index === 0) return 'failed';
      return 'pending';
    }

    if (s === 'proposed') {
      if (index === 0) return 'active';
      return 'pending';
    }

    if (s === 'queued') {
      if (index < 1) return 'completed';
      if (index === 1) return 'active';
      return 'pending';
    }

    if (s === 'blocked') {
      if (index < 2) return 'completed';
      if (index === 2) return 'active';
      return 'pending';
    }

    if (s === 'awaiting_approval') {
      if (index < 3) return 'completed';
      if (index === 3) return 'active';
      return 'pending';
    }

    if (s === 'running') {
      if (index < 4) return 'completed';
      if (index === 4) return 'active';
      return 'pending';
    }

    return 'pending';
  };

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-[#161619] border border-white/[0.06]">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <h4 className="text-xs font-mono font-bold uppercase text-zinc-100 tracking-wider">
            Agent Execution Pipeline
          </h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          Lifecycle: {task.status.toUpperCase()}
        </span>
      </div>

      <div className="relative pl-2 pt-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.id} className="relative flex items-start gap-3 pb-5 group last:pb-1">
              {/* Connecting Line */}
              {!isLast && (
                <div
                  className={`absolute left-[11px] top-[24px] bottom-0 w-[2px] transition-colors ${
                    state === 'completed'
                      ? 'bg-emerald-500/50'
                      : state === 'active'
                      ? 'bg-gradient-to-b from-amber-400 to-white/10'
                      : state === 'failed'
                      ? 'bg-rose-500/40'
                      : 'bg-white/[0.06]'
                  }`}
                />
              )}

              {/* Node Indicator */}
              <div className="relative z-10 shrink-0 mt-0.5">
                {state === 'completed' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}

                {state === 'active' && (
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-400/60 flex items-center justify-center text-amber-300 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                )}

                {state === 'failed' && (
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                )}

                {state === 'pending' && (
                  <div className="w-6 h-6 rounded-full bg-[#111113] border border-white/[0.08] flex items-center justify-center text-zinc-500 font-mono text-[10px]">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Step Info */}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      state === 'active'
                        ? 'text-amber-300'
                        : state === 'completed'
                        ? 'text-zinc-200'
                        : state === 'failed'
                        ? 'text-rose-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {step.name}
                  </span>

                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#111113] border border-white/[0.06] text-zinc-400 shrink-0">
                    {step.agent}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-tight">
                  {step.description}
                </p>

                {state === 'active' && task.status === 'awaiting_approval' && idx === 3 && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Action required: Sign off plan below to begin code synthesis.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
