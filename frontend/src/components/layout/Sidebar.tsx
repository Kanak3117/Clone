"use client";

import React, { useState } from 'react';
import { Search, Plus, UserPlus } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { ContactList } from './ContactList';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { NewGroupModal } from '../contacts/NewGroupModal';
import { NewContactModal } from '../contacts/NewContactModal';

import { usePathname } from 'next/navigation';

export function Sidebar() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
    const pathname = usePathname();
    const isChatActive = pathname !== '/chats';

    return (
        <aside className={`w-full md:w-[360px] flex-shrink-0 flex-col h-full bg-gray-50 dark:bg-[#1e1e1e] ${isChatActive ? 'hidden md:flex' : 'flex'}`}>
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
                    <h2 className="font-semibold text-lg">Signal</h2>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'chats' ? (
                        <button onClick={() => setIsGroupModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-full transition-colors" title="New Group">
                            <Plus className="w-5 h-5" />
                        </button>
                    ) : (
                        <button onClick={() => setIsContactModalOpen(true)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2c2c2c] rounded-full transition-colors" title="Add Contact">
                            <UserPlus className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 pb-2 flex gap-4 border-b border-gray-200 dark:border-gray-800 mb-3">
                <button 
                    onClick={() => setActiveTab('chats')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'chats' ? 'text-[#3A76F0]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Chats
                    {activeTab === 'chats' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3A76F0] rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('contacts')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'contacts' ? 'text-[#3A76F0]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Contacts
                    {activeTab === 'contacts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3A76F0] rounded-t-full" />}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'chats' ? (
                    <>
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
                        <div className="flex-1 overflow-y-auto">
                            <ConversationList searchQuery={searchQuery} />
                        </div>
                    </>
                ) : (
                    <ContactList />
                )}
            </div>

            <NewContactModal open={isContactModalOpen} onOpenChange={setIsContactModalOpen} />
            <NewGroupModal open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen} />
        </aside>
    );
}
