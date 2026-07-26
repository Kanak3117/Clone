"use client";

import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { formatRelative } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { User } from '@/types';
import { MessageSquare } from 'lucide-react';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';
import { useFlipList } from '@/lib/useFlip';

interface ConversationListProps {
    searchQuery: string;
}

function ConversationListSkeleton() {
    return (
        <ul className="flex flex-col pt-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 mx-2">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-[#303030] animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-[#303030] rounded animate-pulse w-[40%]" />
                        <div className="h-3 bg-gray-200 dark:bg-[#303030] rounded animate-pulse w-[65%]" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function ConversationList({ searchQuery }: ConversationListProps) {
    const { conversations, isLoadingConversations, messages, createConversation } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    const [globalUsers, setGlobalUsers] = useState<User[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

    const listRef = useFlipList([conversations, searchQuery]);

    useEffect(() => {
        if (!searchQuery) {
            setGlobalUsers([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingGlobal(true);
            try {
                const res = await fetchApi(`/users?search=${encodeURIComponent(searchQuery)}`);
                setGlobalUsers(res);
            } catch (e) {
                console.error("Failed to fetch global users:", e);
            } finally {
                setIsSearchingGlobal(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    if (isLoadingConversations) {
        return <ConversationListSkeleton />;
    }

    const filteredConversations = conversations.filter(c => {
        const name = c.name || c.participants.find(p => p.user_id !== currentUser?.id)?.display_name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleStartGlobalChat = async (userId: string) => {
        try {
            const conv = await createConversation({ type: 'direct', user_ids: [userId] });
            router.push(`/chats/${conv.id}`);
        } catch (e) {
            console.error("Failed to start conversation:", e);
        }
    };

    if (!searchQuery && filteredConversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 h-full p-8 text-center">
                <MessageSquare className="w-10 h-10 mb-4 text-[var(--text-secondary)] opacity-80" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">No conversations yet</p>
            </div>
        );
    }

    const dmUserIds = new Set(
        conversations
            .filter(c => c.type === 'direct')
            .flatMap(c => c.participants.map(p => p.id))
    );
    const filteredGlobalUsers = globalUsers.filter(u => !dmUserIds.has(u.id));

    return (
        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-thin pb-4">
            {searchQuery && (filteredConversations.length > 0 || filteredGlobalUsers.length > 0) && (
                <div className="px-5 py-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Existing Chats
                </div>
            )}
            
            <ul ref={listRef as any} className="flex flex-col">
                {filteredConversations.map(conv => {
                    const isActive = pathname === `/chats/${conv.id}`;
                    const otherUser = conv.type === 'direct' ? conv.participants.find(p => p.user_id !== currentUser?.id) : null;
                    const displayName = conv.name || otherUser?.display_name || 'Unknown';
                    const avatar = conv.avatar_url || otherUser?.avatar_url;
                    
                    const recentMsgs = messages[conv.id];
                    const lastMsg = recentMsgs && recentMsgs.length > 0 ? recentMsgs[recentMsgs.length - 1] : null;
                    
                    const timeStr = lastMsg ? formatRelative(new Date(lastMsg.created_at), new Date()) : 
                                   formatRelative(new Date(conv.updated_at), new Date());

                    const unreadCount = conv.unread_count || 0;
                    const isUnread = !isActive && unreadCount > 0;
                    
                    // Unread badge logic
                    let badgeContent = unreadCount.toString();
                    if (unreadCount > 99) badgeContent = "99+";
                    const badgeClass = unreadCount < 10 
                        ? 'w-5 h-5 flex items-center justify-center' 
                        : 'px-1.5 h-5 flex items-center justify-center';

                    return (
                        <li key={conv.id} data-flip-id={conv.id}>
                            <Link 
                                href={`/chats/${conv.id}`}
                                className={`flex items-center gap-3 px-3 py-3 mx-2 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-2 focus:outline-none ${isActive ? 'bg-[var(--active-tint)]' : 'hover:bg-[var(--hover-tint)]'}`}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={avatar || ''} />
                                        <AvatarFallback className={`text-white ${getAvatarColorClass(otherUser?.id || conv.id)}`}>
                                            {getInitials(displayName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {otherUser?.is_online && (
                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#31D158] border-2 border-[var(--bg-primary)] rounded-full" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className={`truncate text-[var(--text-primary)] flex items-center gap-1.5 ${isUnread ? 'font-bold' : 'font-medium'}`}>
                                            {displayName}
                                            {conv.chat_color && (
                                                <span 
                                                    className="w-2 h-2 rounded-full inline-block shrink-0" 
                                                    style={{ backgroundColor: conv.chat_color }} 
                                                />
                                            )}
                                        </h3>
                                        <span className={`text-xs whitespace-nowrap ml-2 ${isUnread ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                            {timeStr.replace(' at ', ', ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                            {lastMsg ? lastMsg.content : 'Started a conversation'}
                                        </p>
                                        <span className={`shrink-0 bg-[var(--signal-blue)] text-white text-[10px] font-bold rounded-full transition-all duration-300 ease-out transform origin-center ${isUnread ? 'scale-100 opacity-100' : 'scale-50 opacity-0 w-0 px-0 overflow-hidden'} ${badgeClass}`}>
                                            {badgeContent}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {searchQuery && (
                <>
                    <div className="px-5 py-2 mt-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Global Search
                    </div>
                    {isSearchingGlobal ? (
                        <div className="p-4 text-center text-sm text-[var(--text-secondary)]">Searching...</div>
                    ) : filteredGlobalUsers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No users found</div>
                    ) : (
                        <ul className="flex flex-col">
                            {filteredGlobalUsers.map(user => (
                                <li key={user.id}>
                                    <button 
                                        onClick={() => handleStartGlobalChat(user.id)}
                                        className="w-full flex items-center gap-3 px-3 py-3 mx-2 rounded-xl transition-colors hover:bg-[var(--hover-tint)] focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus:outline-none text-left"
                                    >
                                        <Avatar className="h-12 w-12 shrink-0">
                                            <AvatarImage src={user.avatar_url || ''} />
                                            <AvatarFallback className={`text-white ${getAvatarColorClass(user.id)}`}>
                                                {getInitials(user.display_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-[var(--text-primary)] truncate">
                                                {user.display_name}
                                            </h3>
                                            <p className="text-sm text-[var(--text-secondary)] truncate">
                                                @{user.username}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
