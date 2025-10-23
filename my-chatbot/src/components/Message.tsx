import { Box, Typography, Paper, Button } from '@mui/material';
import { ChatMessage } from '../types/chat';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';


/**
 * Props interface for the Message component
 */
interface MessageProps {
  /** The message data to display */
  message: ChatMessage;
}

/**
 * Message component that displays a single chat message
 * Styles differ based on whether it's a user or assistant message
 * 
 * @component
 * @example
 * <Message message={{ id: '1', role: 'user', content: 'Hello!', timestamp: new Date() }} />
 */
import React from 'react';

const Message: React.FC<MessageProps> = ({ message }) => {
  // Determine if this is a user message
  const isUser = message.role === 'user';

  /**
   * Format timestamp to a readable string
   * Uses browser's locale for proper date formatting
   */
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        // Align user messages to the right, AI messages to the left
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 6, // Margin bottom for spacing between messages
        width: '100%',
        animation: 'fadeIn 0.3s ease-in'
      }}
    >
      <Paper
        elevation={4} // Subtle shadow for depth
        sx={{
          // Much wider messages - nearly full width
          width: '65%',
          maxWidth: '65%',
          // Different background colours for user vs bot messages
          bgcolor: isUser ? 'primary.main' : 'grey.800',
          // White text for user messages on dark background
          color: isUser ? 'primary.contrastText' : '#ffffff',
          px: 3,  // Horizontal padding
          py: 2, // Vertical padding
          borderRadius: 4, // Rounded corners
          // Remove border radius on the side the message "originates" from
          borderTopRightRadius: isUser ? 0 : undefined,
          borderTopLeftRadius: isUser ? undefined : 0,
          // Smooth hover effect
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)', // Subtle lift on hover
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Typography
            component="div"
            sx={{
              color: 'inherit',
              '& p': { margin: 0, color: 'inherit' },
              '& *': { color: 'inherit' }
            }}
          >
            <ReactMarkdown
              components={{
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  const highlightedCode = match ? hljs.highlight(code, { language: match[1] }).value : code;
                  return (
                    <pre>
                      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                    </pre>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Typography>
          <Button 
            size="small" 
            onClick={() => navigator.clipboard.writeText(message.content)}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              color: isUser ? 'primary.contrastText' : 'text.primary',
            }}
          >
            Copy
          </Button>
        </Box>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            // Slightly transparent text for timestamps
            opacity: 0.7,
            textAlign: 'right',
            fontSize: '0.8rem',
          }}
        >
          {formatTime(message.timestamp)}
        </Typography>
      </Paper>
    </Box>
  );
};

const style = document.createElement('style');
style.textContent = `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(style);

export default React.memo(Message);
