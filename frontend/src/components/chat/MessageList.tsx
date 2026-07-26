"use client";

import React, { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { Clock, Check, CheckCheck } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    typingUsers: string[]; // List of user IDs currently typing
}

export function MessageList({ messages, typingUsers }: MessageListProps) {
    const { user: currentUser } = useAuthStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    return (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((msg, idx) => {
                if (msg.message_type === 'system') {
                    return (
                        <div key={msg.id} className="flex justify-center my-2">
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-center">
                                {msg.content}
                            </span>
                        </div>
                    );
                }

                const isOwn = msg.sender_id === currentUser?.id;
                const showAvatar = !isOwn && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
                
                return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                        <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 text-[15px] leading-relaxed shadow-sm
                                ${isOwn 
                                    ? 'bg-[#3A76F0] text-white rounded-[18px] rounded-br-sm' 
                                    : 'bg-gray-100 dark:bg-[#2c2c2c] text-gray-900 dark:text-gray-100 rounded-[18px] rounded-bl-sm'
                                }`}
                            >
                                {msg.content}
                            </div>
                            <div className="flex items-center gap-1 justify-end mt-1 mx-1">
                                <span className="text-[10px] text-gray-400">
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                </span>
                                {isOwn && (
                                    <span className="text-gray-400">
                                        {msg.client_status === 'sending' ? (
                                            <Clock className="w-3 h-3 text-gray-300" />
                                        ) : msg.statuses?.some(s => s.status === 'read') ? (
                                            <CheckCheck className="w-3 h-3 text-blue-500" />
                                        ) : msg.statuses?.some(s => s.status === 'delivered') ? (
                                            <CheckCheck className="w-3 h-3" />
                                        ) : (
                                            <Check className="w-3 h-3" />
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {typingUsers.length > 0 && (
                <div className="flex justify-start mb-1">
                    <div className="bg-gray-100 dark:bg-[#2c2c2c] px-4 py-3 rounded-[18px] rounded-bl-sm flex items-center gap-1 shadow-sm">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
            
            <div ref={bottomRef} className="h-1" />
        </div>
    );
}
