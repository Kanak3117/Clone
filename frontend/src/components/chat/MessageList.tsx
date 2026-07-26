"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Message } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { format, isToday, isYesterday } from 'date-fns';
import { Clock, Check, CheckCheck, Smile } from 'lucide-react';

interface MessageListProps {
    messages: Message[];
    typingUsers: string[];
    isLoading?: boolean;
}

function formatDateSeparator(dateString: string) {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
}

function MessageListSkeleton() {
    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
            {[1, 2, 3].map(i => (
                <React.Fragment key={i}>
                    <div className="flex justify-start mt-2">
                        <div className="w-[60%] h-12 bg-[var(--surface)] rounded-2xl rounded-bl-sm animate-pulse" />
                    </div>
                    <div className="flex justify-end mt-2">
                        <div className="w-[45%] h-12 bg-[var(--surface)] rounded-2xl rounded-br-sm animate-pulse" />
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}

export function MessageList({ messages, typingUsers, isLoading }: MessageListProps) {
    const { user: currentUser } = useAuthStore();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [initialIds] = useState(() => new Set(messages.map(m => m.id)));

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    if (isLoading && messages.length === 0) {
        return <MessageListSkeleton />;
    }

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-1">
            {messages.map((msg, index) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                const msgDate = new Date(msg.created_at).toDateString();
                const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                const showDateSeparator = msgDate !== prevDate;

                if (msg.message_type === 'system') {
                    return (
                        <React.Fragment key={msg.id}>
                            {showDateSeparator && (
                                <div className="flex justify-center my-4">
                                    <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1 rounded-full">
                                        {formatDateSeparator(msg.created_at)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-center my-2">
                                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1 rounded-full text-center">
                                    {msg.content}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                }

                const isOwn = msg.sender_id === currentUser?.id;
                
                // Grouping logic (reset group if separated by date or system message)
                const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id || prevMsg.message_type === 'system' || showDateSeparator;
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || nextMsg.message_type === 'system' || new Date(nextMsg.created_at).toDateString() !== msgDate;

                const marginTop = isFirstInGroup && !showDateSeparator ? 'mt-3' : 'mt-0.5';
                const isNew = !initialIds.has(msg.id);
                const animationClass = isNew ? 'animate-message-in' : '';

                // Tail precision
                let borderRadiusClass = 'rounded-2xl'; // default fully rounded
                if (isOwn) {
                    if (isFirstInGroup && !isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-br-md'; // Top of run
                    else if (!isFirstInGroup && !isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-r-md'; // Middle of run
                    else if (isLastInGroup && !isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-br-sm'; // Bottom of run
                    else borderRadiusClass = 'rounded-2xl rounded-br-sm'; // Standalone
                } else {
                    if (isFirstInGroup && !isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-bl-md';
                    else if (!isFirstInGroup && !isLastInGroup) borderRadiusClass = 'rounded-2xl rounded-l-md';
                    else if (isLastInGroup && !isFirstInGroup) borderRadiusClass = 'rounded-2xl rounded-bl-sm';
                    else borderRadiusClass = 'rounded-2xl rounded-bl-sm';
                }

                return (
                    <React.Fragment key={msg.id}>
                        {showDateSeparator && (
                            <div className="flex justify-center my-4">
                                <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1 rounded-full">
                                    {formatDateSeparator(msg.created_at)}
                                </span>
                            </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${marginTop} ${animationClass} group relative`}>
                            <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                <div className={`relative px-3 pt-2 pb-2 text-[15px] leading-relaxed shadow-sm min-w-[70px]
                                    ${isOwn 
                                        ? `bg-[var(--signal-blue)] text-white ${borderRadiusClass}` 
                                        : `bg-[var(--surface)] text-[var(--text-primary)] ${borderRadiusClass}`
                                    }`}
                                >
                                    <span className={`${isLastInGroup ? 'pr-10' : ''} inline-block whitespace-pre-wrap word-break-word`}>
                                        {msg.content}
                                    </span>
                                    
                                    {isLastInGroup && (
                                        <div className={`absolute bottom-1 right-2 flex items-center gap-1 opacity-80 ${isOwn ? 'text-blue-100' : 'text-[var(--text-secondary)]'}`}>
                                            <span className="text-[10px] font-medium leading-none">
                                                {format(new Date(msg.created_at), 'HH:mm')}
                                            </span>
                                            {isOwn && (
                                                <span className={msg.statuses?.some(s => s.status === 'read') ? 'text-blue-300' : 'text-blue-100'}>
                                                    {msg.client_status === 'sending' ? (
                                                        <Clock className="w-3 h-3" />
                                                    ) : msg.statuses?.some(s => s.status === 'read') ? (
                                                        <CheckCheck className="w-3 h-3" />
                                                    ) : msg.statuses?.some(s => s.status === 'delivered') ? (
                                                        <CheckCheck className="w-3 h-3" />
                                                    ) : (
                                                        <Check className="w-3 h-3" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Hover Affordance */}
                            <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? 'right-[100%] mr-2 flex-row-reverse' : 'left-[100%] ml-2 flex-row'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}>
                                {!isLastInGroup && (
                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium whitespace-nowrap bg-[var(--bg-primary)] px-1.5 py-0.5 rounded-full shadow-sm border border-[var(--border-line)]">
                                        {format(new Date(msg.created_at), 'HH:mm')}
                                    </span>
                                )}
                                <div className="w-6 h-6 rounded-full bg-[var(--surface)] shadow-sm border border-[var(--border-line)] flex items-center justify-center text-[var(--text-secondary)]">
                                    <Smile className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
            
            {typingUsers.length > 0 && (
                <div className="flex justify-start mt-2">
                    <div className="bg-[var(--surface)] px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-typing-pulse" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-typing-pulse" style={{ animationDelay: '200ms' }} />
                        <span className="w-2 h-2 bg-[var(--text-secondary)] rounded-full animate-typing-pulse" style={{ animationDelay: '400ms' }} />
                    </div>
                </div>
            )}
            
            <div ref={bottomRef} className="h-1" />
        </div>
    );
}
