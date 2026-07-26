"use client";

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Smile, Paperclip, Mic, Send } from 'lucide-react';
import { wsClient } from '@/lib/ws';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

interface MessageInputProps {
    conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
    const [content, setContent] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { addOptimisticMessage } = useChatStore();
    const { user: currentUser } = useAuthStore();

    const handleSend = () => {
        if (!content.trim() || !currentUser) return;
        
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const textContent = content.trim();

        // Optimistic UI Update
        addOptimisticMessage({
            id: tempId,
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: textContent,
            message_type: 'text',
            created_at: new Date().toISOString(),
            client_status: 'sending',
            sender: {
                id: currentUser.id,
                display_name: currentUser.display_name,
                username: currentUser.username,
                avatar_url: currentUser.avatar_url
            }
        });
        
        wsClient.send({
            type: 'message:send',
            conversation_id: conversationId,
            content: textContent,
            temp_id: tempId
        });
        
        setContent('');
        
        // Stop typing indicator immediately
        wsClient.send({
            type: 'typing:stop',
            conversation_id: conversationId
        });
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        
        // Send typing:start
        wsClient.send({
            type: 'typing:start',
            conversation_id: conversationId
        });
        
        // Debounce typing:stop
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            wsClient.send({
                type: 'typing:stop',
                conversation_id: conversationId
            });
        }, 2000);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-[#1e1e1e] flex items-center gap-3">
            <button onClick={() => alert('Feature coming soon!')} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Emojis">
                <Smile className="w-6 h-6" />
            </button>
            <button onClick={() => alert('Feature coming soon!')} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Attachments">
                <Paperclip className="w-6 h-6" />
            </button>
            
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Signal message"
                    className="w-full bg-white dark:bg-[#2c2c2c] border border-gray-200 dark:border-gray-700 rounded-full py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 shadow-sm"
                />
            </div>

            {content.trim() ? (
                <button 
                    onClick={handleSend}
                    className="p-2.5 bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-full transition-colors shadow-sm"
                >
                    <Send className="w-5 h-5 ml-0.5" />
                </button>
            ) : (
                <button onClick={() => alert('Feature coming soon!')} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors" title="Voice Message">
                    <Mic className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
