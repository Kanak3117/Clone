import React from 'react';
import { MessageSquareOff } from 'lucide-react';

export default function ChatsEmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#121212] h-full">
            <div className="text-gray-300 dark:text-gray-700 mb-4">
                <MessageSquareOff className="w-24 h-24" strokeWidth={1} />
            </div>
            <h2 className="text-xl font-medium text-gray-500 dark:text-gray-400">
                Select a chat to start messaging
            </h2>
        </div>
    );
}
