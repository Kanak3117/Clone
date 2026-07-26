export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
    public status: number;
    public detail: string | Record<string, any>;

    constructor(status: number, detail: string | Record<string, any>) {
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

    const res = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Always include cookies
    });

    if (!res.ok) {
        let detail = "An error occurred";
        try {
            const data = await res.json();
            if (data.detail) {
                detail = data.detail;
            }
        } catch (e) {
            // Ignored
        }
        throw new APIError(res.status, detail);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return null;
    }

    try {
        return await res.json();
    } catch (e) {
        return null;
    }
}
