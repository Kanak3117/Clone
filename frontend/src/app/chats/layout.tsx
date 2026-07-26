"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { wsClient } from '@/lib/ws';
import { Sidebar } from '@/components/layout/Sidebar';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, fetchMe } = useAuthStore();
    const { fetchConversations, handleIncomingMessage, handleTypingUpdate } = useChatStore();
    const { handlePresenceUpdate } = usePresenceStore();

    useEffect(() => {
        if (!isAuthenticated) {
            fetchMe();
        }
    }, [isAuthenticated, fetchMe]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
            
            wsClient.connect();
            
            const unsubscribe = wsClient.subscribe((event) => {
                switch (event.type) {
                    case 'message:new':
                        handleIncomingMessage(event.message);
                        // Optional: move conversation to top
                        fetchConversations();
                        break;
                    case 'typing:update':
                        handleTypingUpdate(event.conversation_id, event.user_id, event.is_typing);
                        break;
                    case 'presence:update':
                        handlePresenceUpdate(event.user_id, event.is_online, event.last_seen);
                        break;
                }
            });

            return () => {
                unsubscribe();
                wsClient.disconnect();
            };
        }
    }, [isAuthenticated, fetchConversations, handleIncomingMessage, handleTypingUpdate, handlePresenceUpdate]);

    return (
        <div className="flex h-screen bg-white dark:bg-[#121212] overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 border-l border-gray-200 dark:border-gray-800">
                {children}
            </main>
        </div>
    );
}
