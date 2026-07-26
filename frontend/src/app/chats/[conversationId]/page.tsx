"use client";

import React, { useEffect, use } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useAuthStore } from '@/stores/authStore';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';

interface ChatPageProps {
    params: Promise<{ conversationId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    const { conversationId } = use(params);
    const { conversations, messages, typingUsers, setActiveConversation } = useChatStore();
    const { onlineUsers } = usePresenceStore();
    const { user: currentUser } = useAuthStore();

    useEffect(() => {
        setActiveConversation(conversationId);
        return () => setActiveConversation(null);
    }, [conversationId, setActiveConversation]);

    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center h-full bg-white dark:bg-[#121212]">
                <p className="text-gray-500">Loading conversation...</p>
            </div>
        );
    }

    const otherUser = conversation.type === 'direct' 
        ? conversation.participants.find(p => p.id !== currentUser?.id) 
        : null;
        
    const displayName = conversation.name || otherUser?.display_name || 'Unknown';
    const avatarUrl = conversation.avatar_url || otherUser?.avatar_url;
    
    const presence = otherUser ? onlineUsers[otherUser.id] : null;
    const isOnline = presence ? presence.is_online : !!otherUser?.is_online;
    const lastSeen = presence ? presence.last_seen : otherUser?.last_seen;

    const convMessages = messages[conversationId] || [];
    const activeTypingUsers = typingUsers[conversationId] || [];

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#121212]">
            <ChatHeader 
                conversationId={conversationId}
                isGroup={conversation.type === 'group'}
                displayName={displayName} 
                avatarUrl={avatarUrl}
                isOnline={isOnline}
                lastSeen={lastSeen}
            />
            
            <MessageList 
                messages={convMessages} 
                typingUsers={activeTypingUsers} 
            />
            
            <MessageInput conversationId={conversationId} />
        </div>
    );
}
