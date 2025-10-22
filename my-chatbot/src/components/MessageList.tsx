import { Box, CircularProgress, Typography } from '@mui/material';
import Message from './Message';
import { ChatMessage } from '../types/chat';
import useChatScroll from '../hooks/useChatScroll';

/**
 * Props interface for MessageList component
 */
interface MessageListProps {
    messages: ChatMessage[];
    isLoading?: boolean;
    }

/**
 * MessageList component displays all chat messages in a scrollable container
 * Automatically scrolls to the bottom when new messages arrive
 * 
 * @component
 */
const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {
    const scrollRef = useChatScroll(messages);
    
    return (
        <Box
            ref={scrollRef}
            sx={{
                flexGrow: 1,
                overflowY: 'auto',
                px: 5,
                py: 4,
                display: 'flex',
                flexDirection: 'column',
                '&::-webkit-scrollbar': { width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'primary.light',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'primary.light',
                    borderRadius: '4px',
                    '&:hover': {
                        backgroundColor: 'primary.main',
                    },
                },
            }}
        >
            {messages.length === 0 && !isLoading && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        opacity: 0.6,
                    }}
                >
                    <Typography variant="h5" color='text.secondary' align="center">
                        Start the conversation by typing a message below!
                    </Typography>
                    <Typography variant="body1" color='text.secondary' align="center" sx={{ mt: 1 }}>
                        I'm here to help you with any questions you have.
                    </Typography>
                </Box>
            )}

            {messages.map((message, index) => (
                <Message key={message.id || index} message={message} />
            ))}

            {isLoading && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                    }}
                >
                    <CircularProgress size={20} thickness={4} />
                    <Typography variant="body2" color='text.secondary'>
                        Thinking...
                    </Typography>
                </Box>
            )} 
        </Box>
    );
};

export default MessageList;