import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Conversation, ChatMessage } from '../lib/types';
import { MOCK_CONVERSATIONS, MOCK_CHAT_MESSAGES } from '../lib/mockData';
import { useToast } from '../components/Toast';

const readAllConversations = (): Conversation[] => {
  if (typeof window === 'undefined') return [...MOCK_CONVERSATIONS];
  const saved = localStorage.getItem('geosan_conversations');
  if (!saved) return [...MOCK_CONVERSATIONS];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...MOCK_CONVERSATIONS];
  } catch {
    return [...MOCK_CONVERSATIONS];
  }
};

const saveConversations = (convs: Conversation[]) => {
  localStorage.setItem('geosan_conversations', JSON.stringify(convs));
};

const ensureProjectConversation = (projectId: string): Conversation[] => {
  const all = readAllConversations();
  const existing = all.filter((c) => c.project_id === projectId);
  if (existing.length > 0) return existing;

  const created: Conversation = {
    id: `conv-${projectId}`,
    org_id: 'org-geosan',
    project_id: projectId,
    title: 'ProjectChatAgent',
    adk_session_id: `adk-${projectId}`,
    last_message_at: null,
    message_count: 0,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveConversations([created, ...all]);
  return [created];
};

const getConversations = async (projectId?: string): Promise<Conversation[]> => {
  if (!projectId) return readAllConversations();
  return ensureProjectConversation(projectId);
};

const readAllMessages = (): ChatMessage[] => {
  if (typeof window === 'undefined') return [...MOCK_CHAT_MESSAGES];
  const saved = localStorage.getItem('geosan_messages');
  if (!saved) return [...MOCK_CHAT_MESSAGES];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [...MOCK_CHAT_MESSAGES];
  } catch {
    return [...MOCK_CHAT_MESSAGES];
  }
};

const getChatMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  return readAllMessages().filter((m) => m.conversation_id === conversationId);
};

const saveChatMessages = (msgs: ChatMessage[]) => {
  localStorage.setItem('geosan_messages', JSON.stringify(msgs));
};

export function useChat(projectId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: () => getConversations(projectId),
    enabled: !!projectId,
  });

  const activeConv = conversations[0];

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeConv?.id],
    queryFn: () => getChatMessages(activeConv!.id),
    enabled: !!activeConv,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      text,
      conversationId,
      role = 'user',
      proposedTaskId,
    }: {
      text: string;
      conversationId: string;
      role?: 'user' | 'assistant';
      proposedTaskId?: string | null;
    }) => {
      const allMsgs = readAllMessages();

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role,
        content: text,
        created_at: new Date().toISOString(),
        proposed_task_id: proposedTaskId ?? null,
      };
      saveChatMessages([...allMsgs, newMsg]);

      if (role === 'user') {
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...allMsgs, newMsg],
              project_id: projectId,
            }),
          });

          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();

          const updatedMsgs = readAllMessages();
          updatedMsgs.push({
            id: `msg-${Date.now() + 1}`,
            conversation_id: conversationId,
            role: 'assistant',
            content:
              data.reply ||
              `I received your message: "${text}". AetherOrch backend will process this.`,
            created_at: new Date().toISOString(),
            proposed_task_id: proposedTaskId ?? null,
          });
          saveChatMessages(updatedMsgs);
        } catch {
          // Demo / offline: keep the user message; ProjectChatTab owns plan UI.
        }
      }

      return newMsg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  return {
    conversation: activeConv || null,
    messages,
    loading: loadingConvs || loadingMessages,
    sendMessage: async (text: string, opts?: { proposedTaskId?: string | null }) => {
      const conv = activeConv || ensureProjectConversation(projectId)[0];
      if (!conv) return;
      if (!activeConv) {
        queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      }
      await sendMessageMutation.mutateAsync({
        text,
        conversationId: conv.id,
        proposedTaskId: opts?.proposedTaskId,
      });
    },
  };
}
