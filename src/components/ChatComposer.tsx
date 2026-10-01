import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  'What broke overnight?',
  'How much have we spent this month?',
  'Propose a fix for open QA findings',
  'What would it take to add a debt clearance badge?'
];

export const ChatComposer: React.FC<ChatComposerProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled) return;
    const msg = text.trim();
    setText('');
    await onSend(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t border-white/5 bg-[#161b22]/90 backdrop-blur-md space-y-3">
      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
        <span className="text-[#8b98a8] flex items-center gap-1 shrink-0 text-[10px] uppercase">
          <Sparkles className="w-3 h-3 text-[#F0B230]" /> Quick:
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSend(prompt)}
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
          placeholder="Ask ProjectChatAgent about state, bugs, spend, or propose an improvement… (Enter to send)"
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
