"use client";

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { wsClient } from '@/lib/ws';
import { Sidebar } from '@/components/layout/Sidebar';

import { usePathname } from 'next/navigation';

export default function ChatsLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, fetchMe } = useAuthStore();
    const { fetchConversations, handleIncomingMessage, handleTypingUpdate } = useChatStore();
    const { handlePresenceUpdate } = usePresenceStore();
    const pathname = usePathname();
    const isChatActive = pathname !== '/chats';
    const [wsStatus, setWsStatus] = React.useState('disconnected');

    useEffect(() => {
        if (!isAuthenticated) {
            fetchMe();
        }
    }, [isAuthenticated, fetchMe]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
            
            wsClient.connect();
            
            const unsubscribeStatus = wsClient.onStatusChange((status) => {
                setWsStatus(status);
            });
            
            const unsubscribe = wsClient.subscribe((event) => {
                switch (event.type) {
                    case 'message:new':
                        handleIncomingMessage(event.message, event.temp_id);
                        // Optional: move conversation to top
                        fetchConversations();
                        break;
                    case 'message:status':
                        useChatStore.getState().handleMessageStatus(
                            event.message_id,
                            event.conversation_id,
                            event.user_id,
                            event.status
                        );
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
                unsubscribeStatus();
                unsubscribe();
                wsClient.disconnect();
            };
        }
    }, [isAuthenticated, fetchConversations, handleIncomingMessage, handleTypingUpdate, handlePresenceUpdate]);

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden flex-col relative">
            {wsStatus === 'connecting' && (
                <div className="w-full bg-[#D9A441] text-white text-xs font-medium py-1 text-center shadow-sm z-50">
                    Reconnecting...
                </div>
            )}
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className={`flex-1 flex-col min-w-0 border-l border-[var(--border-line)] ${isChatActive ? 'flex' : 'hidden md:flex'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}
