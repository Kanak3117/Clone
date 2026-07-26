import { fetchApi } from "./api";
import { User } from "../types";

export const auth = {
    login: async (identifier: string, otp: string) => {
        return fetchApi("/auth/login", {
            method: "POST",
            body: JSON.stringify({ identifier, otp })
        });
    },

    register: async (username: string, display_name: string, phone_number?: string, avatar_url?: string) => {
        return fetchApi("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, display_name, phone_number: phone_number || null, avatar_url: avatar_url || null })
        });
    },

    verifyOtp: async (identifier: string, otp: string) => {
        return fetchApi("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ identifier, otp })
        });
    },

    logout: async () => {
        return fetchApi("/auth/logout", {
            method: "POST"
        });
    },

    getMe: async (): Promise<User> => {
        return fetchApi("/auth/me", {
            method: "GET"
        });
    }
};
