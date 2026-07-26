export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
    public status: number;
    public detail: string | Record<string, unknown>;

    constructor(status: number, detail: string | Record<string, unknown>) {
        const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
        super(message);
        this.status = status;
        this.detail = detail;
        this.name = "APIError";
    }
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // Add Authorization header with JWT token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
    });

    if (!res.ok) {
        let detail = "An error occurred";
        try {
            const data = await res.json();
            if (data.detail) {
                detail = data.detail;
            }
        } catch {
            // Ignored
        }

        // Global 401 interceptor to auto-logout stale sessions
        if (res.status === 401 && typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (!path.startsWith('/login') && !path.startsWith('/register')) {
                // Clear the token
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }

        throw new APIError(res.status, detail);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return null;
    }

    try {
        return await res.json();
    } catch {
        return null;
    }
}
