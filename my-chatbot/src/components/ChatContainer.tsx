import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Alert, Snackbar, CircularProgress } from '@mui/material';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { ApiError, ChatMessage, ConversationSummary, GuestSession } from '../types/chat';
import { sendMessage, closeConnection } from '../services/chatService';
import { fetchConversations, fetchConversationMessages } from '../services/conversationService';
import { ensureGuestSession } from '../services/sessionService';
import logo from '../assets/Logo WO Background.png';

const ChatContainer: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<GuestSession | null>(null);
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

    useEffect(() => {
        ensureGuestSession()
            .then(async (guestSession) => {
                setSession(guestSession);
                await refreshConversations(guestSession);
            })
            .catch((err: Error) => {
                setError(err.message || 'Failed to start session');
            });

        return () => {
            closeConnection();
        };
    }, []);

    const refreshConversations = async (
        guestSession: GuestSession,
        focusConversationId?: number
    ) => {
        try {
            const data = await fetchConversations(guestSession.token);
            setConversations(data);
            const targetId = focusConversationId ?? currentConversationId;
            if (targetId) {
                await loadConversation(targetId, guestSession);
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load conversations'
            );
        }
    };

    const loadConversation = async (
        conversationId: number,
        guestSession?: GuestSession
    ): Promise<void> => {
        const activeSession = guestSession ?? session;
        if (!activeSession) {
            return;
        }
        setIsLoading(true);
        try {
            const history = await fetchConversationMessages(
                conversationId,
                activeSession.token
            );
            setMessages(history);
            setCurrentConversationId(conversationId);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load conversation'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const startNewConversation = (): void => {
        setMessages([]);
        setCurrentConversationId(null);
    };

    const handleSendMessage = async (content: string): Promise<void> => {
        if (!session) {
            setError('Chat session is not ready yet.');
            return;
        }

        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content,
            timestamp: new Date(),
            conversationId: currentConversationId ?? undefined,
        };
        const assistantPlaceholder: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            conversationId: currentConversationId ?? undefined,
        };

        setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
        setIsLoading(true);
        setError(null);

        try {
            const response = await sendMessage(
                {
                    message: content,
                    conversationId: currentConversationId,
                },
                session.token,
                (partialContent, conversationId) => {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantPlaceholder.id
                                ? {
                                      ...msg,
                                      content: partialContent,
                                      conversationId,
                                  }
                                : msg
                        )
                    );
                    if (!currentConversationId && conversationId) {
                        setCurrentConversationId(conversationId);
                    }
                }
            );

            setCurrentConversationId(response.conversationId);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantPlaceholder.id
                        ? {
                              ...msg,
                              content: response.reply,
                              conversationId: response.conversationId,
                          }
                        : msg
                )
            );
            await refreshConversations(session, response.conversationId);
        } catch (err) {
            const apiError = err as ApiError;
            setError(
                apiError.message || 'Failed to get response from the chatbot.'
            );
            setMessages((prev) =>
                prev.filter((msg) => msg.id !== assistantPlaceholder.id)
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseError = (): void => {
        setError(null);
    };

    const currentConversationName = useMemo(() => {
        if (!currentConversationId) {
            return 'New conversation';
        }
        return (
            conversations.find((conv) => conv.id === currentConversationId)?.name ||
            'Conversation'
        );
    }, [conversations, currentConversationId]);

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
            }}
        >
            <Box
                sx={{
                    width: '280px',
                    bgcolor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                }}
            >
                <Typography variant="h5" sx={{ mt: 15 }}>
                    Conversations
                </Typography>

                <Box
                    onClick={startNewConversation}
                    sx={{
                        mt: 2,
                        p: 1,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: 1,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                    }}
                >
                    <Typography variant="body1">+ New Conversation</Typography>
                </Box>

                <Box sx={{ mt: 4, flexGrow: 1, overflow: 'auto' }}>
                    {conversations.map((conv) => (
                        <Box
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            sx={{
                                p: 1,
                                mb: 1,
                                bgcolor:
                                    conv.id === currentConversationId
                                        ? 'primary.light'
                                        : 'transparent',
                                color:
                                    conv.id === currentConversationId
                                        ? 'primary.contrastText'
                                        : 'text.primary',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                },
                            }}
                        >
                            <Typography variant="body2" noWrap>
                                {conv.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {conv.createdAt.toLocaleString()}
                            </Typography>
                        </Box>
                    ))}
                    {conversations.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Start a conversation to see it here.
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        py: 2,
                        px: 3,
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <img
                        src={logo}
                        alt="Logo"
                        style={{ height: '100px', width: 'auto' }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <Typography variant="h4" component="h1">
                            {currentConversationName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ask me anything!
                        </Typography>
                    </Box>
                    {isLoading && <CircularProgress size={24} />}
                </Box>

                <Box
                    sx={{
                        flexGrow: 1,
                        overflow: 'hidden',
                        bgcolor: 'background.default',
                        borderRadius: 4,
                        mb: 2,
                    }}
                >
                    <MessageList messages={messages} isLoading={isLoading} />
                </Box>

                <MessageInput
                    onSendMessage={handleSendMessage}
                    disabled={isLoading || !session}
                />
            </Box>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseError}
            >
                <Alert severity="error" onClose={handleCloseError}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default ChatContainer;
