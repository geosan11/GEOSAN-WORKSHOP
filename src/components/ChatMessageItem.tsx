import React, { useState } from 'react';
import { ChatMessage, AgentTask } from '../lib/types';
import { ProposedTaskCard } from './ProposedTaskCard';
import { formatRelative, formatCost, formatTokens } from '../lib/format';
import { Bot, User, Wrench, ChevronDown, ChevronUp, Cpu, Coins } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  proposedTask?: AgentTask | null;
  onProposedTaskResolved?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  proposedTask,
  onProposedTaskResolved
}) => {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-[#084985]/30 border border-[#0873B7]/40 text-[#0873B7] flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-cyan-400" />
        </div>
      )}

      <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message Bubble */}
        <div
          className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
            isUser
              ? 'bg-[#1c2333] border border-white/10 text-[#e6edf3] rounded-tr-sm'
              : 'bg-[#161b22] border border-white/5 text-[#e6edf3] rounded-tl-sm'
          }`}
        >
          <p className="whitespace-pre-line font-sans">{message.content}</p>

          {/* Tool Calls Accordion */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setToolsExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 text-[10px] font-mono text-[#8b98a8] hover:text-[#e6edf3] transition-colors focus:outline-none"
              >
                <Wrench className="w-3 h-3 text-[#F0B230]" />
                <span>
                  {message.tool_calls.length} tool call{message.tool_calls.length !== 1 ? 's' : ''} executed
                </span>
                {toolsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {toolsExpanded && (
                <div className="mt-2 p-2 rounded bg-[#0d1117] border border-white/5 space-y-1.5 font-mono text-[10px] text-[#8b98a8]">
                  {message.tool_calls.map((call, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-[#FFBD59] font-bold block">{String(call.name)}()</span>
                      {Boolean(call.args) && (
                        <pre className="text-[10px] text-slate-400 overflow-x-auto p-1 bg-black/30 rounded">
                          {JSON.stringify(call.args, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Embedded Proposed Task Card if attached */}
        {proposedTask && (
          <ProposedTaskCard task={proposedTask} onResolved={onProposedTaskResolved} />
        )}

        {/* Message Meta */}
        <div
          className={`flex items-center gap-2 text-[10px] font-mono text-[#8b98a8] px-1 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{formatRelative(message.created_at)}</span>

          {!isUser && message.model_used && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#FFBD59]">
                <Cpu className="w-2.5 h-2.5" />
                {message.model_used}
              </span>
            </>
          )}

          {!isUser && message.cost_usd !== null && message.cost_usd !== undefined && message.cost_usd > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Coins className="w-2.5 h-2.5" />
                {formatCost(message.cost_usd)}
              </span>
            </>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-[#F0B230]/20 border border-[#F0B230]/40 text-[#F0B230] flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
