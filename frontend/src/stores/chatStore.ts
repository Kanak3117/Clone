import { create } from 'zustand';
import { Conversation, Message } from '../types';
import { fetchApi } from '../lib/api';
import { useAuthStore } from './authStore';

interface ChatState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: Record<string, Message[]>;
    typingUsers: Record<string, string[]>; // conversation_id -> array of user_ids
    isLoadingConversations: boolean;

    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId: string) => Promise<void>;
    setActiveConversation: (id: string | null) => void;
    createConversation: (params: { type: string, participant_ids?: string[], group_name?: string }) => Promise<Conversation>;
    
    handleIncomingMessage: (message: Message, tempId?: string) => void;
    handleMessageStatus: (messageId: string, conversationId: string, userId: string, status: string) => void;
    handleTypingUpdate: (conversationId: string, userId: string, isTyping: boolean) => void;
    addOptimisticMessage: (message: Message) => void;
    clearUnreadCount: (conversationId: string) => void;
    updateChatColor: (conversationId: string, color: string) => Promise<void>;
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
            const isUpdate = currentMessages.some(m => m.id === message.id);
            
            // Handle updating conversations unread_count if it's a new message and not active
            let newConversations = state.conversations;
            if (!isUpdate && message.message_type !== 'system' && state.activeConversationId !== message.conversation_id) {
                // Ignore if it's our own message from another session
                const currentUser = useAuthStore.getState().user;
                if (message.sender_id !== currentUser?.id) {
                    newConversations = state.conversations.map(c => 
                        c.id === message.conversation_id 
                            ? { ...c, unread_count: (c.unread_count || 0) + 1 }
                            : c
                    );
                }
            }
            
            if (isUpdate) return { conversations: newConversations };
            
            const updatedMessages = [...currentMessages];
            if (tempId) {
                const idx = updatedMessages.findIndex(m => m.id === tempId);
                if (idx !== -1) {
                    updatedMessages[idx] = message;
                    return {
                        conversations: newConversations,
                        messages: {
                            ...state.messages,
                            [message.conversation_id]: updatedMessages
                        }
                    };
                }
            }
            
            return {
                conversations: newConversations,
                messages: {
                    ...state.messages,
                    [message.conversation_id]: [...updatedMessages, message]
                }
            };
        });
    },

    handleMessageStatus: (messageId, conversationId, userId, status) => {
        set(state => {
            const currentMessages = state.messages[conversationId] || [];
            const msgIdx = currentMessages.findIndex(m => m.id === messageId);
            if (msgIdx === -1) return state;

            const updatedMessages = [...currentMessages];
            const msg = { ...updatedMessages[msgIdx] };
            
            const statuses = msg.statuses ? [...msg.statuses] : [];
            const existingIdx = statuses.findIndex(s => s.user_id === userId);
            
            if (existingIdx !== -1) {
                statuses[existingIdx] = { ...statuses[existingIdx], status };
            } else {
                statuses.push({ user_id: userId, status });
            }
            
            msg.statuses = statuses;
            updatedMessages[msgIdx] = msg;
            
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: updatedMessages
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
    },

    clearUnreadCount: (conversationId) => {
        set(state => ({
            conversations: state.conversations.map(c => 
                c.id === conversationId ? { ...c, unread_count: 0 } : c
            )
        }));
    },

    updateChatColor: async (conversationId, color) => {
        // Optimistic update
        set(state => ({
            conversations: state.conversations.map(c =>
                c.id === conversationId ? { ...c, chat_color: color } : c
            )
        }));

        try {
            await fetchApi(`/conversations/${conversationId}/color`, {
                method: 'PATCH',
                body: JSON.stringify({ color })
            });
        } catch (e) {
            console.error("Failed to update chat color", e);
            // Revert on failure by refetching
            get().fetchConversations();
        }
    }
}));
