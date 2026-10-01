import React, { useState } from 'react';
import { QAFinding } from '../lib/types';
import { SeverityBadge } from './SeverityBadge';
import { formatRelative } from '../lib/format';
import { Check, Wrench, Image as ImageIcon, X, ExternalLink } from 'lucide-react';

interface QAFindingRowProps {
  finding: QAFinding;
  onResolve: (id: string) => Promise<void>;
  onCreateFixTask: (finding: QAFinding) => void;
}

export const QAFindingRow: React.FC<QAFindingRowProps> = ({
  finding,
  onResolve,
  onCreateFixTask
}) => {
  const [modalImageOpen, setModalImageOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    try {
      setResolving(true);
      await onResolve(finding.id);
    } finally {
      setResolving(false);
    }
  };

  const steps = Array.isArray(finding.reproduction_steps)
    ? (finding.reproduction_steps as string[])
    : [];

  return (
    <>
      <div className="p-4 rounded-xl bg-[#161b22] border border-white/5 space-y-3 text-xs hover:border-white/10 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <h4 className="font-bold text-[#e6edf3] text-sm">{finding.title}</h4>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                finding.status === 'resolved'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-500/30'
              }`}
            >
              {finding.status.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-mono text-[#8b98a8]">
              {formatRelative(finding.created_at)}
            </span>
          </div>
        </div>

        {/* Component & Description */}
        <div className="space-y-1">
          {finding.component && (
            <span className="font-mono text-[10px] text-[#0873B7] block font-semibold">
              Component: {finding.component}
            </span>
          )}
          {finding.description && (
            <p className="text-[#8b98a8] leading-relaxed font-sans">{finding.description}</p>
          )}
        </div>

        {/* Screenshot & Reproduction Steps */}
        <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
          {/* 120x90 Thumbnail (Addendum A14) */}
          <div className="shrink-0">
            {finding.screenshot_url ? (
              <button
                onClick={() => setModalImageOpen(true)}
                className="group relative w-[120px] h-[90px] rounded-lg overflow-hidden border border-white/10 hover:border-[#F0B230] transition-colors focus:outline-none"
                aria-label="View full size screenshot"
              >
                <img
                  src={finding.screenshot_url}
                  alt={finding.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-mono text-white">
                  Enlarge
                </span>
              </button>
            ) : (
              <div className="w-[120px] h-[90px] rounded-lg bg-[#0d1117] border border-white/5 flex flex-col items-center justify-center text-[#8b98a8] gap-1 p-2 text-center">
                <ImageIcon className="w-5 h-5 text-[#8b98a8]" />
                <span className="text-[10px] font-mono">No screenshot</span>
              </div>
            )}
          </div>

          {/* Numbered reproduction steps */}
          <div className="flex-1 space-y-1.5 w-full">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98a8]">
              REPRODUCTION STEPS
            </span>
            {steps.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1 text-[#e6edf3] font-mono text-[11px] bg-[#0d1117] p-2.5 rounded-lg border border-white/5">
                {steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {String(step)}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[11px] text-[#8b98a8] italic">No reproduction steps captured.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          {finding.status !== 'resolved' && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="px-3 py-1.5 rounded-lg bg-[#1c2333] hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Mark Resolved
            </button>
          )}

          <button
            onClick={() => onCreateFixTask(finding)}
            className="px-3 py-1.5 rounded-lg bg-[#F0B230] text-[#0A1420] hover:bg-[#FFBD59] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5" />
            Create Fix Task
          </button>
        </div>
      </div>

      {/* Modal for full size screenshot */}
      {modalImageOpen && finding.screenshot_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-4xl w-full bg-[#161b22] border border-white/10 rounded-xl overflow-hidden p-2">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#e6edf3] truncate">{finding.title}</span>
              <button
                onClick={() => setModalImageOpen(false)}
                className="text-[#8b98a8] hover:text-white p-1"
                aria-label="Close image modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/50 max-h-[75vh] overflow-auto">
              <img src={finding.screenshot_url} alt={finding.title} className="max-w-full h-auto rounded" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
