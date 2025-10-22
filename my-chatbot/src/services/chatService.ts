import { ChatRequest, ChatResponse, ApiError } from '../types/chat';

/**
 * WebSocket connection manager for real-time chat communication
 */
class WebSocketManager {
    private ws: WebSocket | null = null;
    private url: string;
    private messageResolvers: Map<string, (value: string) => void> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second, exponential backoff

    constructor() {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        // Convert http:// to ws:// or https:// to wss://
        this.url = baseUrl
            .replace(/^http:/, 'ws:')
            .replace(/^https:/, 'wss:');
    }

    /**
     * Connects to the WebSocket server
     */
    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(`${this.url}/ws`);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event: MessageEvent) => {
                    // Call ALL active resolvers (should only be one active request at a time)
                    this.messageResolvers.forEach((resolver) => {
                        resolver(event.data);
                    });
                };

                this.ws.onerror = (error: Event) => {
                    console.error('WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.ws = null;
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Sends a message through the WebSocket with streaming support
     */
    public async sendMessage(
        message: string,
        onUpdate?: (partialContent: string) => void
    ): Promise<string> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Try to reconnect if not connected
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            try {
                const messageId = `${Date.now()}-${Math.random()}`;
                let lastContent = '';
                let lastMessageTime = Date.now();

                // Set a timeout to reject if no response within 30 seconds
                const timeout = setTimeout(() => {
                    clearInterval(checkComplete);
                    this.messageResolvers.delete(messageId);
                    reject(new Error('Message timeout - no response from server'));
                }, 30000);

                this.ws!.send(message);

                // Handler for each incoming message update
                const updateHandler = (value: string) => {
                    lastMessageTime = Date.now();
                    lastContent = value;
                    // Call callback for every update
                    if (onUpdate) {
                        onUpdate(value);
                    }
                };

                this.messageResolvers.set(messageId, updateHandler);

                // Check for stream completion (no messages for 500ms)
                const checkComplete = setInterval(() => {
                    if (Date.now() - lastMessageTime > 500) {
                        clearInterval(checkComplete);
                        clearTimeout(timeout);
                        this.messageResolvers.delete(messageId);
                        resolve(lastContent);
                    }
                }, 100);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Attempts to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Attempting to reconnect in ${delay}ms...`);
            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    /**
     * Closes the WebSocket connection
     */
    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Checks if WebSocket is connected
     */
    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Create a singleton instance
const wsManager = new WebSocketManager();

/**
 * Sends a message to the chatbot API via WebSocket and returns the response
 * @param request - The chat request containing the user's message
 * @param onUpdate - Optional callback to receive streaming updates
 * @returns Promise resolving to the chatbot's response
 * @throws ApiError if the request fails
 */
export const sendMessage = async (
    request: ChatRequest,
    onUpdate?: (partialContent: string) => void
): Promise<ChatResponse> => {
    try {
        // Ensure WebSocket is connected
        if (!wsManager.isConnected()) {
            await wsManager.connect();
        }

        // Send the user's message through WebSocket with streaming callback
        const reply = await wsManager.sendMessage(request.message, onUpdate);

        return {
            reply,
            metadata: {
                model: 'gpt-3.5-turbo',
                tokensUsed: 0, // Backend doesn't provide this yet
            },
        };
    } catch (error) {
        const apiError: ApiError = {
            message: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
            status: 500,
            details: error instanceof Error ? error.stack : undefined,
        };
        throw apiError;
    }
};

/**
 * Initializes the WebSocket connection
 * Call this on app startup
 */
export const initializeConnection = async (): Promise<void> => {
    try {
        await wsManager.connect();
        console.log('Chat service initialized successfully');
    } catch (error) {
        console.error('Failed to initialize chat service:', error);
        // Don't throw - let it retry on first message
    }
};

/**
 * Closes the WebSocket connection
 * Call this on app shutdown
 */
export const closeConnection = (): void => {
    wsManager.disconnect();
};

/**
 * Health check - checks if WebSocket is connected
 */
export const checkApiHealth = async (): Promise<boolean> => {
    if (wsManager.isConnected()) {
        return true;
    }
    try {
        await wsManager.connect();
        return true;
    } catch (error) {
        console.error('Health check failed:', error);
        return false;
    }
};

export default wsManager;