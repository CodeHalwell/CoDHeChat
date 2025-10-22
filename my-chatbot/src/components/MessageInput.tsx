import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { Box, TextField, IconButton, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

/**
 * Props interface for MessageInput component
 */
interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    disabled = false,
    placeholder = 'Type your message...',
    }) => {
    const [inputValue, setInputValue] = useState<string>('');

    const handleSend = (): void => {
        const trimmedMessage = inputValue.trim();
        if (trimmedMessage && !disabled) {
            onSendMessage(trimmedMessage);
            setInputValue('');
        }
    };

    const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setInputValue(event.target.value);
    };

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                p: 3, 
                backgroundColor: 'Background.paper', 
                borderTop: '2px solid', 
                borderColor: 'divider',
            }}>
            <Box 
                sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-end',
                    gap: 1,
                }}>
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={inputValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyPress}
                    placeholder={placeholder}
                    disabled={disabled}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                        },
                    }}
                    slotProps={{
                        'aria-label': 'message input',
                        'aria-describedby': 'send-message-button',
                    }}
                />

                {/* Send Button */}
                <IconButton
                    id='send-message-button'
                    color="primary"
                    onClick={handleSend}
                    disabled={disabled || inputValue.trim() === ''}
                    sx={{
                        height: '56px',
                        width: '56px',
                        borderRadius: '0 4px 4px 0',
                        bgcolor: 'primary.main',
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                        '&:disabled': {
                            bgcolor: 'action.disabledBackground',
                        },
                    }}
                    aria-label="send message">
                    <SendIcon sx={{ color: 'common.white' }} />
                </IconButton>
            </Box>
        </Paper>
    );  
};

export default MessageInput;

