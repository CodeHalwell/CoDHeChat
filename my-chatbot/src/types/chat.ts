export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    conversationId?: number;
}

export interface ChatRequest {
    message: string;
    conversationId?: number | null;
}

export interface ChatResponse {
    reply: string;
    conversationId: number;
    metadata?: {
        model?: string;
        tokensUsed?: number;
    };
}

export interface ApiError {
    message: string;
    status?: number;
    details?: string;
}

export interface ConversationSummary {
    id: number;
    name: string;
    createdAt: Date;
}

export interface GuestSession {
    token: string;
    userId: number;
    issuedAt: number;
}
