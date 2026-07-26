import React from 'react';
import { MessageSquareOff } from 'lucide-react';

export default function ChatsEmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-primary)] h-full">
            <div className="text-[var(--text-secondary)] opacity-50 mb-4">
                <MessageSquareOff className="w-24 h-24" />
            </div>
            <h2 className="text-xl font-medium text-[var(--text-secondary)]">
                Select a chat to start messaging
            </h2>
        </div>
    );
}
