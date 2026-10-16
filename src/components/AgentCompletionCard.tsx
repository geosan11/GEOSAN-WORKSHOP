import React from 'react';
import { AgentTask } from '../lib/types';
import { CheckCircle2, ListOrdered, MessageSquarePlus } from 'lucide-react';

interface AgentCompletionCardProps {
    prompt: string;
    task?: AgentTask | null;
    onFollowUp?: (text: string) => void;
}

const FOLLOW_UPS = [
    'Tighten the done_when checks',
    'Add a security review step',
    'Estimate token spend for this plan',
];

export const AgentCompletionCard: React.FC<AgentCompletionCardProps> = ({
    prompt,
    task,
    onFollowUp,
}) => {
    const planSteps: string[] =
        (Array.isArray(task?.plan?.steps) ? (task?.plan?.steps as string[]) : null) ||
        [
            'Inspect current project invariants and open findings',
            'Draft a numbered execution plan with done_when gates',
            'Hold for operator approval before any build enqueue',
        ];

    return (
        <div className="ml-11 max-w-xl rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#e6edf3] font-sans">Plan formulated</h4>
                    <p className="text-[11px] text-[#8b98a8] font-sans leading-relaxed">
                        Ask mode prepared a proposal for:{' '}
                        <span className="text-[#e6edf3]">&ldquo;{prompt}&rdquo;</span>. Nothing has been enqueued
                        for build yet.
                    </p>
                </div>
            </div>

            <div className="rounded-xl bg-[#0d1117]/80 border border-white/5 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-[#FFBD59]">
                    <ListOrdered className="w-3 h-3" />
                    <span>Proposed steps</span>
                    {task?.id && <span className="text-[#8b98a8] normal-case">· {task.id}</span>}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#e6edf3] font-sans">
                    {planSteps.map((step) => (
                        <li key={step} className="leading-relaxed">
                            {step}
                        </li>
                    ))}
                </ol>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8b98a8]">
                    <MessageSquarePlus className="w-3 h-3 text-cyan-400" />
                    <span>What would you like to modify or add?</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {FOLLOW_UPS.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onFollowUp?.(item)}
                            className="px-2.5 py-1 rounded-full bg-[#0d1117] border border-white/10 hover:border-cyan-500/40 text-[10px] text-[#8b98a8] hover:text-cyan-200 transition-colors font-sans"
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
