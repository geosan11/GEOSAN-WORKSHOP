import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Conversation, ChatMessage } from '../lib/types';
import { MOCK_CONVERSATIONS, MOCK_CHAT_MESSAGES } from '../lib/mockData';
import { useToast } from '../components/Toast';

const getConversations = async (projectId?: string): Promise<Conversation[]> => {
  if (typeof window === 'undefined') return [...MOCK_CONVERSATIONS];
  const saved = localStorage.getItem('geosan_conversations');
  let convs = saved ? JSON.parse(saved) : [...MOCK_CONVERSATIONS];
  return projectId ? convs.filter((c: Conversation) => c.project_id === projectId) : convs;
};

const saveConversations = (convs: Conversation[]) => {
  localStorage.setItem('geosan_conversations', JSON.stringify(convs));
};

const getChatMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  if (typeof window === 'undefined') return [...MOCK_CHAT_MESSAGES];
  const saved = localStorage.getItem('geosan_messages');
  let msgs = saved ? JSON.parse(saved) : [...MOCK_CHAT_MESSAGES];
  return msgs.filter((m: ChatMessage) => m.conversation_id === conversationId);
};

const saveChatMessages = (msgs: ChatMessage[]) => {
  localStorage.setItem('geosan_messages', JSON.stringify(msgs));
};

export function useChat(projectId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', projectId],
    queryFn: () => getConversations(projectId)
  });

  const activeConv = conversations[0];

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeConv?.id],
    queryFn: () => getChatMessages(activeConv!.id),
    enabled: !!activeConv
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, conversationId, role = 'user' }: { text: string, conversationId: string, role?: 'user' | 'assistant' }) => {
      const allMsgs = localStorage.getItem('geosan_messages') 
        ? JSON.parse(localStorage.getItem('geosan_messages')!)
        : [...MOCK_CHAT_MESSAGES];

      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        role,
        content: text,
        created_at: new Date().toISOString()
      };
      saveChatMessages([...allMsgs, newMsg]);

      // Hit real AI endpoint
      if (role === 'user') {
        try {
          const res = await fetch('http://localhost:3001/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: [...allMsgs, newMsg], 
              project_id: conversationId,
              // you can pass modelId from state if you want here
            })
          });
          
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          
          const updatedMsgs = localStorage.getItem('geosan_messages') 
            ? JSON.parse(localStorage.getItem('geosan_messages')!)
            : [...MOCK_CHAT_MESSAGES];
            
          updatedMsgs.push({
            id: `msg-${Date.now()+1}`,
            conversation_id: conversationId,
            role: 'assistant',
            content: data.reply || `I received your message: "${text}". AetherOrch backend will process this.`,
            created_at: new Date().toISOString()
          });
          saveChatMessages(updatedMsgs);
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        } catch (err) {
          console.error('AI Request Error:', err);
          toast.error('AI request failed to connect to proxy');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  return {
    conversation: activeConv || null,
    messages,
    loading: loadingConvs || loadingMessages,
    sendMessage: async (text: string) => {
      if (activeConv) {
        await sendMessageMutation.mutateAsync({ text, conversationId: activeConv.id });
      }
    }
  };
}
