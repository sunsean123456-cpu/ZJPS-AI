import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'evaluation' | 'precheck' | 'sandbox' | 'file' | 'system';
  followUp?: string[];
  metadata?: Record<string, any>;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  addStreamingMessage: (content: string, metadata?: Record<string, any>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setMessages: (messages) => {
    set({ messages });
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setStreaming: (streaming) => {
    set({ isStreaming: streaming });
  },

  addStreamingMessage: (content, metadata) => {
    const id = `streaming_${Date.now()}`;
    set((state) => ({
      messages: [...state.messages, {
        id,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        type: 'text',
        metadata,
      }],
      isStreaming: true,
    }));
  },
}));
