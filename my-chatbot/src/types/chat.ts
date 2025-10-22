/**
 * The role of the chat participant.
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Interface representing a single chat Message.
 * @interface ChatMessage
 */
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
}

/**
 * Interface for API request payload when sending a message.
 * @interface ChatRequest
 */

export interface ChatRequest {
    message: string;
    history: ChatMessage[];
}

/**
 * Interface for API response containing the chatbot's reply
 * @interface ChatResponse
 */
export interface ChatResponse {
    reply: string;
    metadata?: {
        model?: string;
        tokensUsed?: number;
    };
}

/**
 * Interface for error responses from the API
 * @interface ApiError
 */
export interface ApiError {
    message: string;
    status?: number;
    details?: string;
}
