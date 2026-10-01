import React from 'react';
import { AgentTask, TaskStatus } from '../lib/types';
import { Check, Clock, AlertCircle, X, Sparkles, Shield, GitBranch, Terminal, Play, ArrowRight } from 'lucide-react';

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
    description: 'Natural language instruction validated and routed to specialists.'
  },
  {
    id: 'isolation',
    name: 'Git Worktree Isolation',
    agent: 'Worktree Daemon',
    description: 'Isolated branch fork created. Main branch write lock enforced.'
  },
  {
    id: 'planning',
    name: 'Adversarial Plan Review',
    agent: 'ReviewAgent (Sonnet 4)',
    description: 'Diff audited against tenant RLS rules, schema invariants, and secrets.'
  },
  {
    id: 'approval',
    name: 'Operator Approval Gate',
    agent: 'Operator (Human)',
    description: 'Human-in-the-loop review of execution plan and estimated token burn.'
  },
  {
    id: 'execution',
    name: 'Code Synthesis & Local Tests',
    agent: 'CodingAgent (Gemini 3.5)',
    description: 'Implementation committed to worktree branch with unit tests.'
  },
  {
    id: 'qa',
    name: 'Autonomous QA Audit',
    agent: 'QAAgent (agent-qa)',
    description: 'API fuzzing and multi-role RBAC crawl executed.'
  },
  {
    id: 'pr_deploy',
    name: 'Pull Request & Verification',
    agent: 'DeployAgent',
    description: 'PR merged to main and preview deployment verified.'
  }
];

export const TaskExecutionStepper: React.FC<TaskExecutionStepperProps> = ({ task }) => {
  // Determine the active step index (0 to 6) based on task status
  const getStepState = (index: number): 'completed' | 'active' | 'failed' | 'pending' => {
    const s = task.status;

    if (s === 'done') {
      return 'completed';
    }

    if (s === 'failed') {
      // If failed, assume it failed at execution (step 4) or plan (step 2)
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
    <div className="space-y-3 p-4 rounded-xl bg-[#0d1117] border border-white/5">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F0B230]" />
          <h4 className="text-xs font-mono font-bold uppercase text-[#e6edf3] tracking-wider">
            Agent Execution Pipeline
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#8b98a8]">
          Lifecycle: {task.status.toUpperCase()}
        </span>
      </div>

      <div className="relative pl-3 pt-2">
        {PIPELINE_STEPS.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.id} className="relative flex items-start gap-3 pb-6 group last:pb-1">
              {/* Connecting Line (inspired by Hungarian Railway timeline) */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-0 w-[2px] transition-colors ${
                    state === 'completed'
                      ? 'bg-emerald-500'
                      : state === 'active'
                      ? 'bg-gradient-to-b from-[#F0B230] to-white/10'
                      : state === 'failed'
                      ? 'bg-red-500/50'
                      : 'bg-white/10'
                  }`}
                />
              )}

              {/* Node Indicator */}
              <div className="relative z-10 shrink-0 mt-0.5">
                {state === 'completed' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-950">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {state === 'active' && (
                  <div className="w-7 h-7 rounded-full bg-[#F0B230]/20 border-2 border-[#F0B230] flex items-center justify-center text-[#FFBD59] shadow-md shadow-[#F0B230]/20 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#F0B230]" />
                  </div>
                )}

                {state === 'failed' && (
                  <div className="w-7 h-7 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {state === 'pending' && (
                  <div className="w-7 h-7 rounded-full bg-[#161b22] border border-white/20 flex items-center justify-center text-[#8b98a8] font-mono text-[10px]">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Step Info */}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      state === 'active'
                        ? 'text-[#FFBD59]'
                        : state === 'completed'
                        ? 'text-[#e6edf3]'
                        : state === 'failed'
                        ? 'text-red-400'
                        : 'text-[#8b98a8]'
                    }`}
                  >
                    {step.name}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 border border-white/5 text-[#8b98a8] shrink-0">
                    {step.agent}
                  </span>
                </div>

                <p className="text-[11px] text-[#8b98a8] leading-tight">
                  {step.description}
                </p>

                {state === 'active' && task.status === 'awaiting_approval' && idx === 3 && (
                  <div className="mt-2 p-2 rounded bg-[#F0B230]/10 border border-[#F0B230]/30 text-[11px] text-[#FFBD59] flex items-center gap-1.5">
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
