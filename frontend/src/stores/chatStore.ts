import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { fetchApi } from '../lib/api';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Record<string, Message[]>;
    typingUsers: Record<string, string[]>; // conversation_id -> array of user_ids
    isLoadingConversations: boolean;

    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId: string) => Promise<void>;
    setActiveConversation: (id: string | null) => void;
    createConversation: (params: { type: string, user_ids?: string[], group_name?: string }) => Promise<Conversation>;
    
    handleIncomingMessage: (message: Message, tempId?: string) => void;
    handleTypingUpdate: (conversationId: string, userId: string, isTyping: boolean) => void;
    addOptimisticMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: {},
    typingUsers: {},
    isLoadingConversations: false,

    fetchConversations: async () => {
        set({ isLoadingConversations: true });
        try {
            const data = await fetchApi('/conversations');
            if (data) {
                set({ conversations: data });
            }
        } catch (e) {
            console.error("Failed to fetch conversations", e);
        } finally {
            set({ isLoadingConversations: false });
        }
    },

    fetchMessages: async (conversationId: string) => {
        try {
            const data = await fetchApi(`/conversations/${conversationId}/messages?limit=50`);
            if (data && data.messages) {
                set((state) => ({
                    messages: {
                        ...state.messages,
                        [conversationId]: data.messages.reverse()
                    }
                }));
            }
        } catch (e) {
            console.error("Failed to fetch messages", e);
        }
    },

    setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id && !get().messages[id]) {
            get().fetchMessages(id);
        }
    },

    createConversation: async (params) => {
        const data = await fetchApi('/conversations', {
            method: 'POST',
            body: JSON.stringify(params)
        });
        set(state => {
            if (!state.conversations.find(c => c.id === data.id)) {
                return { conversations: [data, ...state.conversations] };
            }
            return state;
        });
        return data;
    },

    addOptimisticMessage: (message: Message) => {
        set(state => {
            const current = state.messages[message.conversation_id] || [];
            return {
                messages: {
                    ...state.messages,
                    [message.conversation_id]: [...current, message]
                }
            };
        });
    },

    handleIncomingMessage: (message, tempId) => {
        set((state) => {
            const currentMessages = state.messages[message.conversation_id] || [];
            if (currentMessages.some(m => m.id === message.id)) return state;
            
            let updatedMessages = [...currentMessages];
            if (tempId) {
                const idx = updatedMessages.findIndex(m => m.id === tempId);
                if (idx !== -1) {
                    updatedMessages[idx] = message;
                    return {
                        messages: {
                            ...state.messages,
                            [message.conversation_id]: updatedMessages
                        }
                    };
                }
            }
            
            return {
                messages: {
                    ...state.messages,
                    [message.conversation_id]: [...updatedMessages, message]
                }
            };
        });
    },

    handleTypingUpdate: (conversationId, userId, isTyping) => {
        set((state) => {
            const current = state.typingUsers[conversationId] || [];
            let newTyping = [...current];
            if (isTyping && !current.includes(userId)) {
                newTyping.push(userId);
            } else if (!isTyping) {
                newTyping = newTyping.filter(id => id !== userId);
            }
            return {
                typingUsers: {
                    ...state.typingUsers,
                    [conversationId]: newTyping
                }
            };
        });
    }
}));
