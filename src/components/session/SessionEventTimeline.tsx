import React, { useState } from 'react';
import {
    Activity,
    CheckCircle2,
    FileCode2,
    GitPullRequest,
    MousePointerClick,
    Navigation,
    ShieldCheck,
    Terminal,
    Clipboard,
} from 'lucide-react';
import { SessionTraceEvent, SessionTraceKind } from '../../lib/sessionTrace';

type TraceTab = 'traces' | 'logs';

interface SessionEventTimelineProps {
    events: SessionTraceEvent[];
    live?: boolean;
    sessionId: string;
    onCopyPrompt?: () => void;
    onDownloadJson?: () => void;
    onReportIssue?: () => void;
}

function kindIcon(kind: SessionTraceKind) {
    switch (kind) {
        case 'shell':
            return Terminal;
        case 'edit':
            return FileCode2;
        case 'plan':
            return Clipboard;
        case 'qa':
            return ShieldCheck;
        case 'approval':
            return CheckCircle2;
        case 'pr':
            return GitPullRequest;
        case 'navigate':
            return Navigation;
        case 'dispatch':
            return MousePointerClick;
        default:
            return Activity;
    }
}

function kindTone(kind: SessionTraceKind): string {
    switch (kind) {
        case 'approval':
            return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
        case 'qa':
            return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
        case 'shell':
            return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
        case 'edit':
            return 'text-violet-300 border-violet-500/30 bg-violet-500/10';
        case 'pr':
            return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
        default:
            return 'text-slate-300 border-white/10 bg-white/5';
    }
}

export const SessionEventTimeline: React.FC<SessionEventTimelineProps> = ({
    events,
    live = false,
    sessionId,
    onCopyPrompt,
    onDownloadJson,
    onReportIssue,
}) => {
    const [tab, setTab] = useState<TraceTab>('traces');

    return (
        <div className="rounded-2xl bg-[#161b22] border border-white/10 overflow-hidden font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Sessions</span>
                        <span className="text-slate-600">›</span>
                        <span className="text-slate-200 truncate font-bold">Session #{sessionId}</span>
                        {live ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase">
                                Idle
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        type="button"
                        onClick={onCopyPrompt}
                        className="px-2.5 py-1 rounded-lg bg-[#0d1117] border border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                    >
                        Copy traces
                    </button>
                    <button
                        type="button"
                        onClick={onDownloadJson}
                        className="px-2.5 py-1 rounded-lg bg-[#0d1117] border border-white/10 text-slate-300 hover:text-white hover:border-white/20"
                    >
                        Download JSON
                    </button>
                    <button
                        type="button"
                        onClick={onReportIssue}
                        className="px-2.5 py-1 rounded-lg bg-[#F0B230]/15 border border-[#F0B230]/40 text-[#FFBD59] hover:bg-[#F0B230]/25 font-bold"
                    >
                        Report a bug
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1 px-5 pt-3">
                <button
                    type="button"
                    onClick={() => setTab('traces')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${tab === 'traces'
                            ? 'bg-[#1c2333] text-[#FFBD59] border border-[#F0B230]/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Agent Traces
                </button>
                <button
                    type="button"
                    onClick={() => setTab('logs')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${tab === 'logs'
                            ? 'bg-[#1c2333] text-[#FFBD59] border border-[#F0B230]/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Logs
                </button>
            </div>

            <div className="p-5 space-y-2 max-h-[28rem] overflow-y-auto">
                {tab === 'traces' ? (
                    events.length === 0 ? (
                        <p className="text-slate-500 text-xs font-sans">No trace events yet for this session.</p>
                    ) : (
                        events.map((event) => {
                            const Icon = kindIcon(event.kind);
                            return (
                                <div
                                    key={event.id}
                                    className="flex gap-3 p-3 rounded-xl bg-[#0d1117] border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${kindTone(event.kind)}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                                {event.kind} @ {event.at}
                                            </span>
                                        </div>
                                        <p className="text-slate-200 font-sans text-xs leading-relaxed">{event.label}</p>
                                        {event.detail && (
                                            <p className="text-slate-500 text-[11px] truncate" title={event.detail}>
                                                {event.detail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    <pre className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed bg-[#0d1117] border border-white/5 rounded-xl p-3">
                        {events
                            .map((e) => `[${e.at}] ${e.kind.toUpperCase()} ${e.label}${e.detail ? ` :: ${e.detail}` : ''}`)
                            .join('\n') || 'No log lines.'}
                    </pre>
                )}
            </div>
        </div>
    );
};
