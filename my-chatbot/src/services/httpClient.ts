const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
    token?: string;
    skipJson?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { token, skipJson, headers, body, ...rest } = options;
    const finalHeaders = new Headers(headers);

    if (token) {
        finalHeaders.set('Authorization', `Bearer ${token}`);
    }

    if (body && !(body instanceof FormData) && !finalHeaders.has('Content-Type')) {
        finalHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        body,
        headers: finalHeaders,
    });

    if (!response.ok) {
        let detail: string;
        try {
            detail = await response.text();
        } catch (e) {
            detail = '';
        }
        throw new Error(detail || 'Request failed');
    }

    if (skipJson || response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export { API_BASE_URL, request };
