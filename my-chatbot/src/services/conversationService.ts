import { ChatMessage, ConversationSummary } from '../types/chat';
import { request } from './httpClient';

interface ConversationResponse {
    id: number;
    name: string;
    created_at: string;
}

interface MessageResponse {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    conversation_id: number;
}

export async function fetchConversations(token: string): Promise<ConversationSummary[]> {
    const response = await request<ConversationResponse[]>(
        '/conversations/',
        {
            token,
        }
    );

    return response
        .map((conversation) => ({
            id: conversation.id,
            name: conversation.name,
            createdAt: new Date(conversation.created_at),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function fetchConversationMessages(
    conversationId: number,
    token: string
): Promise<ChatMessage[]> {
    const response = await request<MessageResponse[]>(
        `/conversations/${conversationId}/messages/`,
        {
            token,
        }
    );

    return response.map((message) => ({
        id: message.id.toString(),
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp),
        conversationId: message.conversation_id,
    }));
}
