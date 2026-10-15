import React, { useEffect, useState } from 'react';
import { Send, Sparkles, HelpCircle, ShieldCheck, ToggleLeft, ToggleRight, Coins } from 'lucide-react';
import { DEFAULT_WEEKLY_LEDGER, fetchBudgetStatus, WeeklyLedgerState } from '../lib/budget';

interface ChatComposerProps {
  onSend: (text: string, mode: 'ask' | 'agent', waitForApproval: boolean) => Promise<void>;
  disabled?: boolean;
  mode?: 'ask' | 'agent';
  onModeChange?: (mode: 'ask' | 'agent') => void;
  agentDisabled?: boolean;
  /** When true, chips sit above the input as a wrapped grid (n8n-style). */
  showChipGrid?: boolean;
  /** Bump after a successful send so the credits footer re-fetches. */
  budgetRevision?: number;
  /** Hide duplicate Ask/Agent controls when the parent header already has them. */
  showModeToggle?: boolean;
}
const QUICK_PROMPTS_ASK = [
  'What broke overnight?',
  'How much have we spent this month?',
  'Propose a fix for open QA findings',
  'Summarize open regressions by severity',
  'What would it take to add a debt clearance badge?',
  'Draft a plan for offline sync hardening',
];

const QUICK_PROMPTS_AGENT = [
  'Execute kobo integer migration plan',
  'Run full regression replay against Kano terminal',
  'Deploy vetted staging build to preview',
  'Re-run ReviewAgent on the open PR',
  'Tighten RLS checks on hub-scoped tables',
  'Generate a weekly spend digest',
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  disabled,
  mode = 'ask',
  onModeChange,
  agentDisabled = false,
  showChipGrid = true,
  budgetRevision = 0,
  showModeToggle = true,
}) => {
  const [text, setText] = useState('');
  const [waitForApproval, setWaitForApproval] = useState(true);
  const [ledger, setLedger] = useState<WeeklyLedgerState>(DEFAULT_WEEKLY_LEDGER);

  const activeMode = mode;
  const quickPrompts = activeMode === 'ask' ? QUICK_PROMPTS_ASK : QUICK_PROMPTS_AGENT;
  const remainingCalls = Math.max(0, ledger.totalCapRequests - ledger.usedRequests);

  useEffect(() => {
    let cancelled = false;
    fetchBudgetStatus().then((state) => {
      if (!cancelled) setLedger(state);
    });
    return () => {
      cancelled = true;
    };
  }, [budgetRevision]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    const msg = text.trim();
    setText('');
    await onSend(msg, activeMode, waitForApproval);
  };

  const handleChipClick = async (prompt: string) => {
    if (disabled) return;
    // Fill then send — avoids leaving stale textarea content if onSend throws.
    setText('');
    await onSend(prompt, activeMode, waitForApproval);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t border-white/5 bg-[#161b22]/90 backdrop-blur-md space-y-3 font-mono text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-white/5">
        {showModeToggle ? (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1117] border border-white/5">
            <button
              type="button"
              onClick={() => onModeChange?.('ask')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeMode === 'ask'
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
              onClick={() => onModeChange?.('agent')}
              title={agentDisabled ? 'Agent mode requires an approved plan' : 'Run in Agent execution mode'}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeMode === 'agent'
                ? 'bg-[#1c2333] text-cyan-300 border border-cyan-500/40 shadow-sm'
                : agentDisabled
                  ? 'text-[#8b98a8]/40 cursor-not-allowed'
                  : 'text-[#8b98a8] hover:text-[#e6edf3]'
                }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Agent</span>
              {agentDisabled && (
                <span className="text-[9px] px-1 rounded bg-white/5 text-[#8b98a8]">Locked</span>
              )}
            </button>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-[#8b98a8] uppercase tracking-wide">
            {activeMode === 'ask' ? 'Ask composer' : 'Agent composer'}
          </span>
        )}

        {activeMode === 'ask' && (
          <button
            type="button"
            onClick={() => setWaitForApproval(!waitForApproval)}
            className="flex items-center gap-2 text-[11px] text-[#8b98a8] hover:text-[#e6edf3] transition-colors self-start sm:self-auto"
          >
            {waitForApproval ? (
              <ToggleRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-[#8b98a8]" />
            )}
            <span>Wait for my approval</span>
            <span className={`text-[10px] font-bold ${waitForApproval ? 'text-emerald-400' : 'text-amber-400'}`}>
              {waitForApproval ? '(Strict gating ON)' : '(Auto-proceed)'}
            </span>
          </button>
        )}
      </div>

      {showChipGrid && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[#e6edf3] font-sans font-semibold">
              {activeMode === 'ask' ? 'What would you like to inspect or plan?' : 'What should the agent execute next?'}
            </p>
            <span className="text-[10px] text-[#8b98a8] flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#F0B230]" />
              Suggestions
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={disabled}
                onClick={() => handleChipClick(prompt)}
                className="text-left px-3 py-2 rounded-xl bg-[#0d1117] hover:bg-[#1c2333] border border-white/5 hover:border-[#F0B230]/40 text-[#8b98a8] hover:text-[#e6edf3] text-[11px] font-sans leading-snug transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeMode === 'ask'
              ? 'Ask ProjectChatAgent to formulate a plan or inspect invariants (does not enqueue build)...'
              : 'Steer the agent workspace with specific directives...'
          }
          rows={2}
          disabled={disabled}
          className="flex-1 bg-[#0d1117] border border-white/10 rounded-xl p-3 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#F0B230] resize-none leading-relaxed"
        />

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 py-3 rounded-xl bg-[#F0B230] text-[#0A1420] font-bold text-xs hover:bg-[#FFBD59] transition-colors flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[10px] text-[#8b98a8] flex items-center gap-1.5">
          <Coins className="w-3 h-3 text-[#F0B230]" />
          <span className="tabular-nums text-[#e6edf3] font-bold">
            {remainingCalls}/{ledger.totalCapRequests}
          </span>
          <span>weekly calls left</span>
          <span className="text-[#8b98a8]/70">· ${ledger.usedUsd.toFixed(2)} / ${ledger.totalCapUsd.toFixed(2)}</span>
        </span>
        <span className="text-[10px] text-[#8b98a8]">{ledger.weekKey}</span>
      </div>
    </div>
  );
};
