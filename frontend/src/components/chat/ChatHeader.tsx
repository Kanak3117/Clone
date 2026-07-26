"use client";

import React, { useState } from 'react';
import { Phone, Video, MoreVertical, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelative } from 'date-fns';
import { GroupInfoModal } from './GroupInfoModal';

interface ChatHeaderProps {
    conversationId: string;
    isGroup: boolean;
    displayName: string;
    avatarUrl?: string | null;
    isOnline: boolean;
    lastSeen?: string | null;
}

export function ChatHeader({ conversationId, isGroup, displayName, avatarUrl, isOnline, lastSeen }: ChatHeaderProps) {
    const [infoOpen, setInfoOpen] = useState(false);
    const timeStr = lastSeen ? formatRelative(new Date(lastSeen), new Date()) : null;

    return (
        <>
            <header className="h-16 px-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-[#121212]/50 backdrop-blur-md">
                <div 
                    className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => isGroup && setInfoOpen(true)}
                >
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarUrl || ''} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                            {displayName}
                        </h2>
                        {!isGroup && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isOnline ? 'Online' : timeStr ? `Last seen ${timeStr}` : 'Offline'}
                            </p>
                        )}
                        {isGroup && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tap for group info
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                    <button onClick={() => alert('Feature coming soon!')} className="hover:text-[#3A76F0] transition-colors" title="Video Call">
                        <Video className="w-5 h-5" />
                    </button>
                    <button onClick={() => alert('Feature coming soon!')} className="hover:text-[#3A76F0] transition-colors" title="Voice Call">
                        <Phone className="w-5 h-5" />
                    </button>
                    {isGroup && (
                        <button onClick={() => setInfoOpen(true)} className="hover:text-[#3A76F0] transition-colors" title="Group Info">
                            <Info className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </header>

            {isGroup && (
                <GroupInfoModal 
                    conversationId={conversationId} 
                    open={infoOpen} 
                    onOpenChange={setInfoOpen} 
                />
            )}
        </>
    );
}
