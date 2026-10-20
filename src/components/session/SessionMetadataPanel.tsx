import React from 'react';
import { ExternalLink } from 'lucide-react';
import { StatusPill } from '../StatusPill';
import { formatCost, formatDateTime } from '../../lib/format';
import { SessionMetadata } from '../../lib/sessionTrace';

interface SessionMetadataPanelProps {
    meta: SessionMetadata;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-slate-500 shrink-0">{label}</span>
            <div className="text-right text-slate-200 break-all">{children}</div>
        </div>
    );
}

export const SessionMetadataPanel: React.FC<SessionMetadataPanelProps> = ({ meta }) => {
    return (
        <div className="p-5 rounded-2xl bg-[#161b22] border border-white/10 space-y-1 font-mono text-xs">
            <h3 className="font-bold text-sm text-slate-100 uppercase pb-3 border-b border-white/5 mb-1">
                Session metadata
            </h3>

            <Row label="State">
                <StatusPill status={meta.status} />
            </Row>
            <Row label="Session ID">
                <span className="font-bold">{meta.sessionId}</span>
            </Row>
            <Row label="Execution mode">
                <span className="uppercase">{meta.modelMode}</span>
            </Row>
            <Row label="Assigned agent">
                <span>{meta.assignedAgent}</span>
            </Row>
            <Row label="Cost">
                <span className="text-emerald-400 font-bold tabular-nums">{formatCost(meta.costUsd)}</span>
            </Row>
            <Row label="Duration">
                <span className="tabular-nums">{meta.durationLabel}</span>
            </Row>
            <Row label="Viewer">
                <span>{meta.live ? 'Live' : meta.idleLabel}</span>
            </Row>
            <Row label="Worktree">
                <span>{meta.branch}</span>
            </Row>
            <Row label="Created">
                <span>{formatDateTime(meta.createdAt)}</span>
            </Row>
            {meta.prUrl && (
                <Row label="Pull request">
                    <a
                        href={meta.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                        Open PR <ExternalLink className="w-3 h-3" />
                    </a>
                </Row>
            )}

            <div className="pt-3 mt-2 border-t border-white/5 space-y-1.5">
                <span className="text-slate-500 block">Prompt</span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed whitespace-pre-wrap">
                    {meta.prompt}
                </p>
            </div>
        </div>
    );
};
