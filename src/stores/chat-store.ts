import { create } from "zustand";
import localforage from "localforage";
import { nanoid } from "nanoid";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
}

interface ChatStore {
  chats: Chat[];
  currentChatId: string | null;
  messages: Record<string, ChatMessage[]>; // chatId -> messages
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createChat: () => string;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  setCurrentChat: (chatId: string | null) => void;
  addMessage: (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Persistence
  loadChats: () => Promise<void>;
  saveChats: () => Promise<void>;
}

const STORAGE_KEY_CHATS = "browser-os-chats";
const STORAGE_KEY_MESSAGES = "browser-os-chat-messages";
const STORAGE_KEY_CURRENT_CHAT = "browser-os-current-chat-id";

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  currentChatId: null,
  messages: {},
  isLoading: false,
  error: null,

  createChat: () => {
    const chatId = nanoid();
    const now = Date.now();
    const newChat: Chat = {
      id: chatId,
      title: "Untitled Chat",
      createdAt: now,
      lastModified: now,
    };
    
    set((state) => ({
      chats: [newChat, ...state.chats],
      currentChatId: chatId,
      messages: { ...state.messages, [chatId]: [] },
    }));
    
    get().saveChats();
    return chatId;
  },

  deleteChat: (chatId: string) => {
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[chatId];
      
      const newChats = state.chats.filter((c) => c.id !== chatId);
      const newCurrentChatId = state.currentChatId === chatId 
        ? (newChats.length > 0 ? newChats[0].id : null)
        : state.currentChatId;
      
      return {
        chats: newChats,
        currentChatId: newCurrentChatId,
        messages: newMessages,
      };
    });
    
    get().saveChats();
  },

  renameChat: (chatId: string, newTitle: string) => {
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, title: newTitle, lastModified: Date.now() } : c
      ),
    }));
    
    get().saveChats();
  },

  setCurrentChat: (chatId: string | null) => {
    set({ currentChatId: chatId });
    localforage.setItem(STORAGE_KEY_CURRENT_CHAT, chatId);
  },

  addMessage: (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: nanoid(),
      timestamp: Date.now(),
    };
    
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      const updatedMessages = {
        ...state.messages,
        [chatId]: [...chatMessages, newMessage],
      };
      
      // Update chat lastModified
      const updatedChats = state.chats.map((c) =>
        c.id === chatId ? { ...c, lastModified: Date.now() } : c
      );
      
      return {
        messages: updatedMessages,
        chats: updatedChats,
      };
    });
    
    get().saveChats();
  },

  setMessages: (chatId: string, messages: ChatMessage[]) => {
    set((state) => ({
      messages: { ...state.messages, [chatId]: messages },
    }));
    get().saveChats();
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  loadChats: async () => {
    try {
      const chats = await localforage.getItem<Chat[]>(STORAGE_KEY_CHATS) || [];
      const messages = await localforage.getItem<Record<string, ChatMessage[]>>(STORAGE_KEY_MESSAGES) || {};
      const currentChatId = await localforage.getItem<string | null>(STORAGE_KEY_CURRENT_CHAT) || null;
      
      // Sort chats by lastModified (newest first)
      const sortedChats = [...chats].sort((a, b) => b.lastModified - a.lastModified);
      
      set({
        chats: sortedChats,
        messages,
        currentChatId,
      });
    } catch (error) {
      console.error("Failed to load chats:", error);
      set({ error: "Failed to load chats" });
    }
  },

  saveChats: async () => {
    try {
      const { chats, messages, currentChatId } = get();
      await localforage.setItem(STORAGE_KEY_CHATS, chats);
      await localforage.setItem(STORAGE_KEY_MESSAGES, messages);
      await localforage.setItem(STORAGE_KEY_CURRENT_CHAT, currentChatId);
    } catch (error) {
      console.error("Failed to save chats:", error);
      set({ error: "Failed to save chats" });
    }
  },
}));

