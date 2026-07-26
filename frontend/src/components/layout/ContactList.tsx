"use client";

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Contact } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useChatStore } from '@/stores/chatStore';
import { useRouter } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';

function ContactListSkeleton() {
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

export function ContactList() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { createConversation } = useChatStore();
    const router = useRouter();

    useEffect(() => {
        const fetchContacts = async () => {
            setIsLoading(true);
            try {
                const res = await fetchApi(`/contacts?search=${encodeURIComponent(searchQuery)}`);
                setContacts(res || []);
            } catch (e) {
                console.error("Failed to fetch contacts", e);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchContacts, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleStartChat = async (userId: string) => {
        try {
            const conv = await createConversation({ type: 'direct', participant_ids: [userId] });
            router.push(`/chats/${conv.id}`);
        } catch (e) {
            console.error("Failed to start chat", e);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
                    <Input 
                        placeholder="Search contacts" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-[var(--surface)] border-none rounded-full focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pb-4">
                {isLoading ? (
                    <ContactListSkeleton />
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <Users className="w-10 h-10 mb-4 text-[var(--text-secondary)] opacity-80" />
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                            {searchQuery ? 'No matching contacts' : 'No contacts yet'}
                        </p>
                    </div>
                ) : (
                    <ul className="flex flex-col">
                        {contacts.map(contact => {
                            const user = contact.contact_user;
                            if (!user) return null;
                            
                            const displayName = contact.nickname || user.display_name;

                            return (
                                <li key={contact.id}>
                                    <button 
                                        onClick={() => handleStartChat(user.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors hover:bg-[var(--hover-tint)] focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus:outline-none text-left"
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.avatar_url || ''} />
                                                <AvatarFallback className={`text-white ${getAvatarColorClass(user.id)}`}>
                                                    {getInitials(displayName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {user.is_online && (
                                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#31D158] border-2 border-[var(--bg-primary)] rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-[var(--text-primary)] text-base truncate">
                                                {displayName}
                                            </h3>
                                            <p className="text-sm text-[var(--text-secondary)] truncate flex items-center justify-between mt-0.5">
                                                <span>@{user.username}</span>
                                                {user.is_online ? (
                                                    <span className="text-xs text-[var(--signal-blue)] font-medium">Online</span>
                                                ) : null}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
