import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] p-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    {/* Placeholder for Signal Logo */}
                    <div className="w-16 h-16 bg-[#3A76F0] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Signal Clone</h1>
                </div>
                {children}
            </div>
        </div>
    );
}
