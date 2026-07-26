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

interface ConversationListProps {
    searchQuery: string;
}

export function ConversationList({ searchQuery }: ConversationListProps) {
    const { conversations, isLoadingConversations, messages, createConversation } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    const [globalUsers, setGlobalUsers] = useState<User[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

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
        return <div className="p-4 text-center text-sm text-gray-500">Loading...</div>;
    }

    const filteredConversations = conversations.filter(c => {
        const name = c.name || c.participants.find(p => p.id !== currentUser?.id)?.display_name || '';
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
        return <div className="p-4 text-center text-sm text-gray-500">No conversations yet</div>;
    }

    // Filter global users to remove those we already have a DM with
    const dmUserIds = new Set(
        conversations
            .filter(c => c.type === 'direct')
            .flatMap(c => c.participants.map(p => p.id))
    );
    const filteredGlobalUsers = globalUsers.filter(u => !dmUserIds.has(u.id));

    return (
        <div className="flex flex-col pb-4">
            {searchQuery && (filteredConversations.length > 0 || filteredGlobalUsers.length > 0) && (
                <div className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Existing Chats
                </div>
            )}
            
            <ul className="flex flex-col">
                {filteredConversations.map(conv => {
                    const isActive = pathname === `/chats/${conv.id}`;
                    const otherUser = conv.type === 'direct' ? conv.participants.find(p => p.id !== currentUser?.id) : null;
                    const displayName = conv.name || otherUser?.display_name || 'Unknown';
                    const avatar = conv.avatar_url || otherUser?.avatar_url;
                    
                    const recentMsgs = messages[conv.id];
                    const lastMsg = recentMsgs && recentMsgs.length > 0 ? recentMsgs[recentMsgs.length - 1] : null;
                    
                    const timeStr = lastMsg ? formatRelative(new Date(lastMsg.created_at), new Date()) : 
                                   formatRelative(new Date(conv.updated_at), new Date());

                    return (
                        <li key={conv.id}>
                            <Link 
                                href={`/chats/${conv.id}`}
                                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors ${isActive ? 'bg-[#3A76F0] text-white' : 'hover:bg-gray-200 dark:hover:bg-[#2c2c2c]'}`}
                            >
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={avatar || ''} />
                                    <AvatarFallback className={`${isActive ? 'bg-white/20 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className={`font-medium truncate ${isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {displayName}
                                        </h3>
                                        <span className={`text-xs whitespace-nowrap ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {timeStr.replace(' at ', ', ')}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {lastMsg ? lastMsg.content : 'Started a conversation'}
                                    </p>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            {searchQuery && (
                <>
                    <div className="px-5 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Global Search
                    </div>
                    {isSearchingGlobal ? (
                        <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                    ) : filteredGlobalUsers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No users found</div>
                    ) : (
                        <ul className="flex flex-col">
                            {filteredGlobalUsers.map(user => (
                                <li key={user.id}>
                                    <button 
                                        onClick={() => handleStartGlobalChat(user.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-[#2c2c2c] text-left"
                                    >
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={user.avatar_url || ''} />
                                            <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                {user.display_name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {user.display_name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
