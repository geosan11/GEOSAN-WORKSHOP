import React from 'react';
import { FolderGit2, Sparkles, Table2, ArrowRight } from 'lucide-react';

export type StartPath = 'ai' | 'scratch' | 'github';

interface HowToStartCardsProps {
    workspaceLabel?: string;
    onChoose: (path: StartPath) => void;
}

const CARDS: Array<{
    id: StartPath;
    title: string;
    eyebrow: string;
    body: string;
    icon: React.ElementType;
    accent: string;
}> = [
        {
            id: 'ai',
            title: 'Build a vertical with AI',
            eyebrow: 'Agent cobuilder',
            body: 'Turn an operating process into a monitored project with worktrees, budget gates, and a first agent plan.',
            icon: Sparkles,
            accent: 'from-[#F0B230]/20 to-transparent border-[#F0B230]/40',
        },
        {
            id: 'scratch',
            title: 'Start from scratch',
            eyebrow: 'Blank project',
            body: 'Build your ideal workflow from an empty project — name it, set budget, then attach git when ready.',
            icon: Table2,
            accent: 'from-sky-500/15 to-transparent border-sky-500/30',
        },
        {
            id: 'github',
            title: 'Connect GitHub',
            eyebrow: 'Repository first',
            body: 'Point at a repository URL, enable it under your org quota, and pull the codebase for analysis.',
            icon: FolderGit2,
            accent: 'from-emerald-500/15 to-transparent border-emerald-500/30',
        },
    ];

export const HowToStartCards: React.FC<HowToStartCardsProps> = ({
    workspaceLabel = 'GEOSAN workspace',
    onChoose,
}) => {
    return (
        <div className="rounded-2xl bg-[#161b22] border border-white/10 overflow-hidden shadow-lg">
            <div className="px-6 py-5 border-b border-white/5 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                    Workspace · {workspaceLabel}
                </p>
                <h2 className="text-lg font-bold text-[#e6edf3]">How do you want to start?</h2>
                <p className="text-xs text-slate-400 max-w-xl">
                    Starred verticals and agent pipelines will appear here. Pick a path to create your first project.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-y md:divide-y-0 divide-white/5">
                {CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => onChoose(card.id)}
                            className={`group text-left p-5 md:p-6 bg-gradient-to-b ${card.accent} hover:bg-white/[0.03] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B230]/50`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#0d1117] border border-white/10 flex items-center justify-center mb-4">
                                <Icon className="w-5 h-5 text-[#FFBD59]" />
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-1">
                                {card.eyebrow}
                            </p>
                            <h3 className="text-sm font-bold text-[#e6edf3] mb-2 flex items-center gap-2">
                                {card.title}
                                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#FFBD59]" />
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans">{card.body}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
