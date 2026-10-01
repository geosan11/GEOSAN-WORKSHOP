import React, { useEffect, useState, useRef } from 'react';
import { useDataProvider } from '../lib/dataProvider';
import { Conversation, ChatMessage, AgentTask, Project } from '../lib/types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';
import { LoadingState } from './LoadingState';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

interface ProjectChatTabProps {
  project: Project;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({ project }) => {
  const dataProvider = useDataProvider();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [convs, allTasks] = await Promise.all([
        dataProvider.getConversations(project.id),
        dataProvider.getTasks(project.id)
      ]);
      const activeConv = convs[0];
      setConversation(activeConv || null);
      setTasks(allTasks);

      if (activeConv) {
        const msgs = await dataProvider.getChatMessages(activeConv.id);
        setMessages(msgs);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = dataProvider.subscribeChange(() => {
      loadData();
    });
    return unsubscribe;
  }, [project.id, dataProvider]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending]);

  const handleSendMessage = async (text: string) => {
    if (!conversation) return;
    setSending(true);
    try {
      await dataProvider.sendMessage(conversation.id, text, project.id);
      await loadData();
    } finally {
      setSending(false);
    }
  };

  if (loading && !conversation) {
    return (
      <div className="p-6">
        <LoadingState type="lines" count={4} />
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden flex flex-col h-[640px] shadow-xl">
      {/* Chat Sub-header */}
      <div className="px-5 py-3.5 border-b border-white/5 bg-[#0d1117]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#084985]/30 border border-[#0873B7]/40 text-[#0873B7] flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#e6edf3] font-display">
                ProjectChatAgent ({project.name})
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono">
                mode="chat"
              </span>
            </div>
            <span className="text-[10px] text-[#8b98a8] font-mono block">
              Persistent multi-turn collaborator · Read-access to all project metrics
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#8b98a8]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Session</span>
        </div>
      </div>

      {/* Message History Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#1c2333] flex items-center justify-center text-[#F0B230] mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-[#e6edf3]">
              Start conversation with {project.name}'s Project Agent
            </h4>
            <p className="text-[11px] text-[#8b98a8] max-w-sm leading-relaxed">
              Ask about recent tasks, open regression findings, spend, or brainstorm an improvement. The agent will formulate and propose tasks for your approval.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const proposedTask = msg.proposed_task_id
              ? tasks.find((t) => t.id === msg.proposed_task_id) || null
              : null;

            return (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                proposedTask={proposedTask}
                onProposedTaskResolved={loadData}
              />
            );
          })
        )}

        {sending && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b98a8] p-2">
            <span className="w-2 h-2 rounded-full bg-[#F0B230] animate-ping" />
            <span>ProjectChatAgent is analyzing project telemetry…</span>
          </div>
        )}
      </div>

      {/* Composer at Bottom */}
      <ChatComposer onSend={handleSendMessage} disabled={sending} />
    </div>
  );
};
