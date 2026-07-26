"use client";

import React, { useState } from 'react';
import { Phone, Video, Info, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelative } from 'date-fns';
import { GroupInfoModal } from './GroupInfoModal';
import Link from 'next/link';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';
import { parseDate } from '@/lib/dateUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from '@/stores/chatStore';

const CHAT_COLORS = [
    '#3A76F0', // Signal Blue
    '#E64C3C', // Crimson
    '#F24E1E', // Vermilion
    '#D9A441', // Amber
    '#2E8B57', // Forest
    '#20B2AA', // Teal
    '#8A2BE2', // Violet
    '#DDA0DD'  // Plum
];

interface ChatHeaderProps {
    conversationId: string;
    isGroup: boolean;
    displayName: string;
    avatarUrl?: string | null;
    isOnline: boolean;
    lastSeen?: string | null;
    chatColor?: string | null;
}

export function ChatHeader({ conversationId, isGroup, displayName, avatarUrl, isOnline, lastSeen, chatColor }: ChatHeaderProps) {
    const [infoOpen, setInfoOpen] = useState(false);
    const timeStr = lastSeen ? formatRelative(parseDate(lastSeen), new Date()) : null;
    const { updateChatColor } = useChatStore();

    return (
        <>
            <header className="h-16 px-4 md:px-6 border-b border-[var(--border-line)] flex items-center justify-between bg-[var(--bg-primary)] z-10">
                <div className="flex items-center gap-2 md:gap-3">
                    <Link href="/chats" className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-tint)] active:scale-[0.98] rounded-full transition-all">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div 
                        className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer p-1 -ml-1 rounded-xl hover:bg-[var(--hover-tint)] active:scale-[0.98] transition-all' : ''}`}
                        onClick={() => isGroup && setInfoOpen(true)}
                    >
                        <Avatar className="h-10 w-10 ring-2 ring-[var(--signal-blue)] ring-offset-2 ring-offset-[var(--bg-primary)]">
                            <AvatarImage src={avatarUrl || ''} />
                            <AvatarFallback className={`text-white ${getAvatarColorClass(conversationId)}`}>
                                {getInitials(displayName)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-medium text-[var(--text-primary)] text-base leading-tight">
                                {displayName}
                            </h2>
                            {!isGroup && (
                                <p className={`text-sm mt-0.5 ${isOnline ? 'text-[var(--signal-blue)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                                    {isOnline ? 'Online' : timeStr ? `Last seen ${timeStr}` : 'Offline'}
                                </p>
                            )}
                            {isGroup && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Tap for group info
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <button onClick={() => alert('Feature coming soon!')} className="p-2 rounded-full hover:bg-[var(--hover-tint)] hover:text-[var(--text-primary)] active:scale-[0.98] transition-all" title="Video Call">
                        <Video className="w-5 h-5" />
                    </button>
                    <button onClick={() => alert('Feature coming soon!')} className="p-2 rounded-full hover:bg-[var(--hover-tint)] hover:text-[var(--text-primary)] active:scale-[0.98] transition-all" title="Voice Call">
                        <Phone className="w-5 h-5" />
                    </button>
                    {isGroup ? (
                        <button onClick={() => setInfoOpen(true)} className="p-2 rounded-full hover:bg-[var(--hover-tint)] hover:text-[var(--text-primary)] active:scale-[0.98] transition-all" title="Group Info">
                            <Info className="w-5 h-5" />
                        </button>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="p-2 rounded-full hover:bg-[var(--hover-tint)] hover:text-[var(--text-primary)] active:scale-[0.98] transition-all" title="Chat Info">
                                <Info className="w-5 h-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[var(--surface)] border-[var(--border-line)]">
                                <DropdownMenuLabel className="text-[var(--text-primary)]">Chat Color</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[var(--border-line)]" />
                                <div className="p-2 flex flex-wrap gap-2">
                                    {CHAT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => updateChatColor(conversationId, color)}
                                            className="w-6 h-6 rounded-full shadow-sm flex items-center justify-center transition-transform active:scale-[0.95]"
                                            style={{ backgroundColor: color }}
                                            aria-label={`Select color ${color}`}
                                        >
                                            {(chatColor || '#3A76F0') === color && (
                                                <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
