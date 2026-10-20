import React, { useEffect, useId, useState } from 'react';
import { CheckCircle2, Flag, X } from 'lucide-react';

/** Steel session-issue categories, kept for refero fidelity. */
export const SESSION_ISSUE_CATEGORIES = [
    'Proxy',
    'Captcha',
    'Timeout',
    'Navigation',
    'Recording',
    'Live Viewer',
    'Other',
] as const;

export type SessionIssueCategory = (typeof SESSION_ISSUE_CATEGORIES)[number];

export interface SessionIssueReport {
    id: string;
    sessionId: string;
    category: SessionIssueCategory;
    description: string;
    createdAt: string;
}

const STORAGE_KEY = 'geosan_session_issue_reports';

function persistReport(report: SessionIssueReport): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: SessionIssueReport[] = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(list) ? [report, ...list] : [report];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
    } catch {
        // Demo persistence is best-effort.
    }
}

interface ReportIssueModalProps {
    open: boolean;
    sessionId: string;
    onClose: () => void;
    onSubmitted?: (report: SessionIssueReport) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
    open,
    sessionId,
    onClose,
    onSubmitted,
}) => {
    const titleId = useId();
    const [category, setCategory] = useState<SessionIssueCategory | ''>('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCategory('');
        setDescription('');
        setSubmitting(false);
        setSubmitted(false);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const t = window.setTimeout(() => {
            document.getElementById('issue-category')?.focus();
        }, 40);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.clearTimeout(t);
        };
    }, [open, sessionId]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose, submitting]);

    if (!open) return null;

    const canSubmit = Boolean(category) && description.trim().length > 0 && !submitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit || !category) return;
        setSubmitting(true);
        const report: SessionIssueReport = {
            id: `issue-${Date.now().toString(36)}`,
            sessionId,
            category,
            description: description.trim(),
            createdAt: new Date().toISOString(),
        };
        persistReport(report);
        // Brief pause mirrors Steel submit feedback before success panel.
        await new Promise((r) => setTimeout(r, 280));
        setSubmitting(false);
        setSubmitted(true);
        onSubmitted?.(report);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
        >
            <div className="w-full max-w-md rounded-2xl bg-[#161b22] border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-[#FFBD59]" />
                        <h2 id={titleId} className="text-sm font-bold text-[#e6edf3]">
                            Report Session Issue
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {submitted ? (
                    <div className="px-5 py-8 space-y-3 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-[#e6edf3]">Report submitted</p>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                            Thanks for flagging this. Our team will look into the session and follow up if needed.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Describe what went wrong. Session context is attached automatically.
                        </p>

                        <div className="space-y-1.5">
                            <label htmlFor="issue-category" className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                                Issue Category
                            </label>
                            <select
                                id="issue-category"
                                required
                                value={category}
                                onChange={(e) => setCategory(e.target.value as SessionIssueCategory | '')}
                                className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-[#F0B230]/50 focus:outline-none"
                            >
                                <option value="" disabled>
                                    Select a category
                                </option>
                                {SESSION_ISSUE_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="issue-description" className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                                Description
                            </label>
                            <textarea
                                id="issue-description"
                                required
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what happened with more details."
                                className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-[#F0B230]/50 focus:outline-none resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3.5 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="px-4 py-2 rounded-xl bg-[#F0B230] text-slate-950 text-xs font-bold hover:bg-[#FFBD59] disabled:opacity-40"
                            >
                                {submitting ? 'Submitting…' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
