import React, { useState } from 'react';
import { Send, Sparkles, HelpCircle, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string, mode: 'ask' | 'agent', waitForApproval: boolean) => Promise<void>;
  disabled?: boolean;
  mode?: 'ask' | 'agent';
  onModeChange?: (mode: 'ask' | 'agent') => void;
  agentDisabled?: boolean;
}

const QUICK_PROMPTS_ASK = [
  'What broke overnight?',
  'How much have we spent this month?',
  'Propose a fix for open QA findings',
  'What would it take to add a debt clearance badge?'
];

const QUICK_PROMPTS_AGENT = [
  'Execute kobo integer migration plan',
  'Run full regression replay against Kano terminal',
  'Deploy vetted staging build to preview'
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  disabled,
  mode = 'ask',
  onModeChange,
  agentDisabled = false
}) => {
  const [text, setText] = useState('');
  const [waitForApproval, setWaitForApproval] = useState(true);

  const activeMode = mode;
  const quickPrompts = activeMode === 'ask' ? QUICK_PROMPTS_ASK : QUICK_PROMPTS_AGENT;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    const msg = text.trim();
    setText('');
    await onSend(msg, activeMode, waitForApproval);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t border-white/5 bg-[#161b22]/90 backdrop-blur-md space-y-3 font-mono text-xs">
      {/* Ask vs Agent Mode Toggle & Wait For Approval */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-white/5">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0d1117] border border-white/5">
          <button
            type="button"
            onClick={() => onModeChange?.('ask')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMode === 'ask'
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
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeMode === 'agent'
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

        {/* Wait For My Approval Toggle (defaulting ON) */}
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
            <span className="text-[10px] text-emerald-400 font-bold">
              {waitForApproval ? '(Strict gating ON)' : '(Auto-proceed)'}
            </span>
          </button>
        )}
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-[#8b98a8] flex items-center gap-1 shrink-0 text-[10px] uppercase">
          <Sparkles className="w-3 h-3 text-[#F0B230]" /> Quick:
        </span>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSend(prompt, activeMode, waitForApproval)}
            className="px-2.5 py-1 rounded-full bg-[#0d1117] hover:bg-[#1c2333] border border-white/5 hover:border-[#F0B230]/40 text-[#8b98a8] hover:text-[#e6edf3] whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
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
    </div>
  );
};
