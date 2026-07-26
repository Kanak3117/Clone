import { create } from 'zustand';

interface PresenceState {
    onlineUsers: Record<string, { is_online: boolean; last_seen?: string | null }>;
    handlePresenceUpdate: (userId: string, isOnline: boolean, lastSeen?: string | null) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
    onlineUsers: {},
    handlePresenceUpdate: (userId, isOnline, lastSeen) => {
        set((state) => ({
            onlineUsers: {
                ...state.onlineUsers,
                [userId]: { is_online: isOnline, last_seen: lastSeen }
            }
        }));
    }
}));
