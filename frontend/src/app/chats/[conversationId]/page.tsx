"use client";

import React, { useEffect, use } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchApi } from '@/lib/api';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';

interface ChatPageProps {
    params: { conversationId: string } | Promise<{ conversationId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    // Safely unwrap params regardless of Next.js version
    const resolvedParams = params instanceof Promise ? React.use(params) : params as { conversationId: string };
    const conversationId = resolvedParams.conversationId;
    const { conversations, messages, typingUsers, setActiveConversation } = useChatStore();
    const { onlineUsers } = usePresenceStore();
    const { user: currentUser } = useAuthStore();

    useEffect(() => {
        setActiveConversation(conversationId);
        
        // Mark messages as read
        const markAsRead = async () => {
            try {
                await fetchApi(`/conversations/${conversationId}/read`, { method: 'POST' });
                useChatStore.getState().clearUnreadCount(conversationId);
            } catch (e) {
                console.error("Failed to mark messages as read", e);
            }
        };
        markAsRead();

        return () => setActiveConversation(null);
    }, [conversationId, setActiveConversation]);

    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center h-full bg-[var(--bg-primary)]">
                <p className="text-[var(--text-secondary)]">Loading conversation...</p>
            </div>
        );
    }

    const otherUser = conversation.type === 'direct' 
        ? conversation.participants.find(p => p.user_id !== currentUser?.id) 
        : null;
        
    const displayName = conversation.name || otherUser?.display_name || 'Unknown';
    const avatarUrl = conversation.avatar_url || otherUser?.avatar_url;
    
    const presence = otherUser ? onlineUsers[otherUser.user_id] : null;
    const isOnline = presence ? presence.is_online : !!otherUser?.is_online;
    const lastSeen = presence ? presence.last_seen : otherUser?.last_seen;

    const convMessages = messages[conversationId] || [];
    const activeTypingUsers = typingUsers[conversationId] || [];

    const customStyle = conversation.chat_color 
        ? { '--signal-blue': conversation.chat_color } as React.CSSProperties 
        : undefined;

    return (
        <div 
            className="flex-1 flex flex-col h-full bg-[var(--bg-primary)]"
            style={customStyle}
        >
            <ChatHeader 
                conversationId={conversationId}
                isGroup={conversation.type === 'group'}
                displayName={displayName} 
                avatarUrl={avatarUrl}
                isOnline={isOnline}
                lastSeen={lastSeen}
                chatColor={conversation.chat_color}
            />
            
            <MessageList 
                messages={convMessages} 
                typingUsers={activeTypingUsers} 
            />
            
            <MessageInput conversationId={conversationId} />
        </div>
    );
}
