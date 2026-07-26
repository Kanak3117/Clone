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
        <div className="p-3 bg-[var(--bg-primary)] flex items-center gap-2 border-t border-[var(--border-line)] shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
            <button onClick={() => alert('Feature coming soon!')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-tint)] rounded-full transition-colors" title="Emojis">
                <Smile className="w-5 h-5" />
            </button>
            <button onClick={() => alert('Feature coming soon!')} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-tint)] rounded-full transition-colors" title="Attachments">
                <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Signal message"
                    className="w-full bg-[var(--surface)] text-[var(--text-primary)] border border-transparent rounded-full py-2 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] transition-all shadow-inner"
                />
            </div>

            <button 
                onClick={content.trim() ? handleSend : () => alert('Feature coming soon!')}
                className={`p-2.5 rounded-full transition-all duration-200 shadow-sm flex items-center justify-center active:scale-95 ${
                    content.trim() 
                    ? 'bg-[var(--signal-blue)] text-white hover:opacity-90' 
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={content.trim() ? "Send Message" : "Voice Message"}
            >
                {content.trim() ? (
                    <Send className="w-5 h-5 ml-0.5" />
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
        </div>
    );
}
