"use client";

import React, { useState } from 'react';
import { Search, Plus, UserPlus } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { NewGroupModal } from '../contacts/NewGroupModal';
import { NewContactModal } from '../contacts/NewContactModal';

export function Sidebar() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    return (
        <aside className="w-[360px] flex-shrink-0 flex flex-col h-full bg-gray-50 dark:bg-[#1e1e1e]">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/settings">
                        <Avatar className="h-9 w-9 hover:opacity-80 transition-opacity cursor-pointer">
                            <AvatarImage src={user?.avatar_url || ''} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                {user?.display_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <h2 className="font-semibold text-lg">Chats</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsContactModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-full transition-colors" title="New Chat">
                        <UserPlus className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsGroupModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-full transition-colors" title="New Group">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input 
                        placeholder="Search chats" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-gray-200 dark:bg-[#2c2c2c] border-none rounded-full focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                <ConversationList searchQuery={searchQuery} />
            </div>

            <NewContactModal open={isContactModalOpen} onOpenChange={setIsContactModalOpen} />
            <NewGroupModal open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen} />
        </aside>
    );
}
