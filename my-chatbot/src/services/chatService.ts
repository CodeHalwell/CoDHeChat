import { ApiError, ChatRequest, ChatResponse } from '../types/chat';
import { API_BASE_URL } from './httpClient';

interface MessageResolver {
    resolve: (value: ChatResponse) => void;
    reject: (error: Error) => void;
    onUpdate?: (partialContent: string, conversationId: number) => void;
    latest?: string;
    conversationId?: number;
}

class WebSocketManager {
    private ws: WebSocket | null = null;
    private messageResolvers: Map<string, MessageResolver> = new Map();
    private connectPromise: Promise<void> | null = null;
    private activeToken: string | null = null;

    private get url(): string {
        return API_BASE_URL.replace(/^http/i, (value) =>
            value.toLowerCase() === 'https' ? 'wss' : 'ws'
        );
    }

    public async connect(token: string): Promise<void> {
        if (
            this.ws &&
            this.ws.readyState === WebSocket.OPEN &&
            this.activeToken === token
        ) {
            return;
        }

        if (this.connectPromise && this.activeToken === token) {
            return this.connectPromise;
        }

        this.activeToken = token;
        this.connectPromise = new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`${this.url}/ws?token=${token}`);
                this.ws.onopen = () => {
                    this.connectPromise = null;
                    resolve();
                };
                this.ws.onerror = () => {
                    this.cleanupConnection();
                    reject(new Error('WebSocket connection failed'));
                };
                this.ws.onclose = () => {
                    this.cleanupConnection();
                };
                this.ws.onmessage = (event: MessageEvent) => {
                    this.handleServerMessage(event);
                };
            } catch (error) {
                this.connectPromise = null;
                reject(error as Error);
            }
        });

        return this.connectPromise;
    }

    public disconnect(): void {
        this.cleanupConnection();
    }

    public async sendMessage(
        request: ChatRequest,
        token: string,
        onUpdate?: (partialContent: string, conversationId: number) => void
    ): Promise<ChatResponse> {
        await this.connect(token);

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        return new Promise((resolve, reject) => {
            const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            this.messageResolvers.set(requestId, {
                resolve: (value) => {
                    resolve(value);
                    this.messageResolvers.delete(requestId);
                },
                reject: (error) => {
                    reject(error);
                    this.messageResolvers.delete(requestId);
                },
                onUpdate,
            });

            try {
                this.ws!.send(
                    JSON.stringify({
                        request_id: requestId,
                        message: request.message,
                        conversation_id: request.conversationId ?? null,
                    })
                );
            } catch (error) {
                this.messageResolvers.delete(requestId);
                reject(error instanceof Error ? error : new Error('Failed to send message'));
            }
        });
    }

    public isConnected(token?: string): boolean {
        return (
            !!this.ws &&
            this.ws.readyState === WebSocket.OPEN &&
            (!token || this.activeToken === token)
        );
    }

    private handleServerMessage(event: MessageEvent): void {
        try {
            const data = JSON.parse(event.data);
            if (!data.requestId && !data.request_id) {
                return;
            }
            const requestId: string = data.requestId || data.request_id;
            if (!requestId) {
                return;
            }
            const resolver = this.messageResolvers.get(requestId);
            if (!resolver) {
                return;
            }

            switch (data.type) {
                case 'chunk': {
                    resolver.latest = data.content;
                    resolver.conversationId = data.conversationId;
                    if (resolver.onUpdate && typeof data.content === 'string') {
                        resolver.onUpdate(data.content, data.conversationId);
                    }
                    break;
                }
                case 'complete': {
                    resolver.resolve({
                        reply: resolver.latest ?? '',
                        conversationId: resolver.conversationId ?? data.conversationId,
                        metadata: { model: 'gpt-4o-mini' },
                    });
                    break;
                }
                case 'error': {
                    resolver.reject(
                        new Error(data.detail || 'Chat streaming failed')
                    );
                    break;
                }
                default:
                    break;
            }
        } catch (error) {
            console.error('Failed to process WebSocket message', error);
        }
    }

    private cleanupConnection(): void {
        if (this.ws) {
            this.ws.close();
        }
        this.ws = null;
        this.connectPromise = null;
        this.messageResolvers.forEach((resolver) =>
            resolver.reject(new Error('WebSocket disconnected'))
        );
        this.messageResolvers.clear();
    }
}

const wsManager = new WebSocketManager();

export const sendMessage = async (
    request: ChatRequest,
    token: string,
    onUpdate?: (partialContent: string, conversationId: number) => void
): Promise<ChatResponse> => {
    try {
        return await wsManager.sendMessage(request, token, onUpdate);
    } catch (error) {
        const apiError: ApiError = {
            message: error instanceof Error ? error.message : 'Failed to send message.',
        };
        throw apiError;
    }
};

export const closeConnection = (): void => {
    wsManager.disconnect();
};

export const checkApiHealth = async (token: string): Promise<boolean> => {
    try {
        await wsManager.connect(token);
        return true;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
};

export default wsManager;
