import { GuestSession } from '../types/chat';
import { request } from './httpClient';

const SESSION_STORAGE_KEY = 'codhechat.session';
const SESSION_TTL_MS = 25 * 60 * 1000; // Refresh every 25 minutes

export async function ensureGuestSession(): Promise<GuestSession> {
    const stored = getStoredSession();
    if (stored && !isExpired(stored)) {
        return stored;
    }

    const response = await request<{ access_token: string; user_id: number }>(
        '/auth/guest',
        {
            method: 'POST',
        }
    );

    const session: GuestSession = {
        token: response.access_token,
        userId: response.user_id,
        issuedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
}

export function getStoredSession(): GuestSession | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as GuestSession;
        if (!parsed.token) {
            return null;
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to parse stored session', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }
}

export function clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}

function isExpired(session: GuestSession): boolean {
    return Date.now() - session.issuedAt > SESSION_TTL_MS;
}
