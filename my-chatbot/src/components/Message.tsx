import { Box, Typography, Paper, Button } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import { ChatMessage } from '../types/chat';
import React from 'react';

interface MessageProps {
    message: ChatMessage;
}

const Message: React.FC<MessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    const formatTime = (date: Date): string =>
        new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                mb: 6,
                width: '100%',
                animation: 'fadeIn 0.3s ease-in',
            }}
        >
            <Paper
                elevation={4}
                sx={{
                    width: '65%',
                    maxWidth: '65%',
                    bgcolor: isUser ? 'primary.main' : 'grey.800',
                    color: isUser ? 'primary.contrastText' : '#ffffff',
                    px: 3,
                    py: 2,
                    borderRadius: 4,
                    borderTopRightRadius: isUser ? 0 : undefined,
                    borderTopLeftRadius: isUser ? undefined : 0,
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                    },
                }}
            >
                <Box sx={{ position: 'relative' }}>
                    <Typography component="div" sx={{ color: 'inherit' }}>
                        <ReactMarkdown
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                                code({ inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeText = String(children).replace(/\n$/, '');
                                    if (!inline && match) {
                                        const highlighted = hljs.highlight(codeText, {
                                            language: match[1],
                                        }).value;
                                        const safeHtml = DOMPurify.sanitize(highlighted);
                                        return (
                                            <pre>
                                                <code
                                                    className={className}
                                                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                                                />
                                            </pre>
                                        );
                                    }
                                    return (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
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

                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 0.5,
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

export default React.memo(Message);
