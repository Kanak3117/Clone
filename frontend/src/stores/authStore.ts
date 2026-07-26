import { create } from 'zustand';
import { User } from '../types';
import { auth } from '../lib/auth';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    fetchMe: () => Promise<void>;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    
    fetchMe: async () => {
        set({ isLoading: true });
        try {
            const user = await auth.getMe();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
    
    logout: async () => {
        try {
            await auth.logout();
        } catch (error) {
            // Ignore logout errors (e.g. already unauthenticated)
        } finally {
            set({ user: null, isAuthenticated: false });
        }
    }
}));
