import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export interface WorkingStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'done';
}

interface AgentWorkingStreamProps {
    steps: WorkingStep[];
    headline?: string;
}

export const AgentWorkingStream: React.FC<AgentWorkingStreamProps> = ({
    steps,
    headline = 'Working…',
}) => {
    if (steps.length === 0) return null;

    return (
        <div className="ml-11 max-w-xl rounded-2xl border border-white/10 bg-[#0d1117]/90 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#FFBD59]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="font-bold">{headline}</span>
            </div>
            <ul className="space-y-1.5">
                {steps.map((step) => {
                    const Icon =
                        step.status === 'done' ? CheckCircle2 : step.status === 'active' ? Loader2 : Circle;
                    const color =
                        step.status === 'done'
                            ? 'text-emerald-400'
                            : step.status === 'active'
                                ? 'text-[#F0B230]'
                                : 'text-[#8b98a8]/50';
                    return (
                        <li key={step.id} className={`flex items-center gap-2 text-[11px] font-mono ${color}`}>
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${step.status === 'active' ? 'animate-spin' : ''}`} />
                            <span className={step.status === 'pending' ? 'text-[#8b98a8]/70' : 'text-[#e6edf3]'}>
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
