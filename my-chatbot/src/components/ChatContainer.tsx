// src/components/ChatContainer.tsx
import { useState } from 'react';
import { Box, Typography, Alert, Snackbar, Button } from '@mui/material';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { ChatMessage, ApiError } from '../types/chat';
import { sendMessage } from '../services/chatService';
import logo from '../assets/Logo WO Background.png'; // or logo.svg, or whatever your file is named

/**
 * ChatContainer component manages the entire chat interface
 * Handles state management, API calls, and error handling
 * 
 * @component
 */
const ChatContainer: React.FC = () => {
  // State for storing all messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // State for loading indicator
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State for error handling
  const [error, setError] = useState<string | null>(null);

  // New sate for managing conversations
  const [conversations, setConversations] = useState<Array<{
     id: string; 
     name: string; 
     messages: ChatMessage[];
     timestamp: Date;
  }>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  /**
   * Saves the current conversation to the sidebar
   */
  const saveCurrentConversation = (): void => {
    if (messages.length === 0) return;

    const title = messages.find(m => m.role === 'user')?.content.slice(0, 20) || 
        `Chat ${new Date().toLocaleDateString()}`;

    const conversationId = currentConversationId || generateId();

    setConversations((prev) => {
      // Check if conversation already exists
      const existingIndex = prev.findIndex(c => c.id === conversationId);
      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          messages,
          timestamp: new Date(),
        };
        return updated;
      } else {
        // Add new conversation
        return [
          ...prev,
          {
            id: conversationId,
            name: title,
            messages,
            timestamp: new Date(),
          },
        ];
      }
    });

    setCurrentConversationId(conversationId);
  }

    /**
   * Starts a new conversation
   */
  const startNewConversation = (): void => {
    if (messages.length > 0) {
      saveCurrentConversation();
    }
    setMessages([]);
    setCurrentConversationId(null);
  };
  
  /**
   * Loads a saved conversation
   */
  const loadConversation = (conversationId: string): void => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setCurrentConversationId(conversationId);
    }
  };
  
  /**
   * Generates a unique ID for messages
   * In production, you might use UUID library
   */
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Handles sending a new message
   * 1. Adds user message to state
   * 2. Calls API to get bot response
   * 3. Updates bot response in state as it streams
   * 4. Handles any errors
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    if (!currentConversationId) {
      setCurrentConversationId(generateId());
    }    
    // Create user message object
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // Create bot message object with empty content (will be updated as stream arrives)
    const botMessageId = generateId();
    const botMessage: ChatMessage = {
      id: botMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    // Add user message to state immediately for instant feedback
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Add empty bot message for streaming updates
    setMessages((prevMessages) => [...prevMessages, botMessage]);

    // Set loading state
    setIsLoading(true);

    // Clear any previous errors
    setError(null);

    try {
      // Call API with user message and conversation history
      // This will return the complete response once streaming is done
      const response = await sendMessage(
        {
          message: content,
          history: [...messages, userMessage],
        },
        // Callback to update message as it streams
        (partialContent: string) => {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: partialContent }
                : msg
            )
          );
        }
      );

      // Update final message content (in case the streaming callback didn't capture everything)
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botMessageId
            ? { ...msg, content: response.reply }
            : msg
        )
      );

      console.log('Final bot response received:', response.reply);
      console.log('Current conversation ID:', currentConversationId);
      console.log('Current messages count:', messages.length);
            // Save after state has updated
            // Save after state has updated - use a ref to avoid duplicates
      setTimeout(() => {
        // Get the current conversation ID at the time of saving
        const convId = currentConversationId;
        
        setMessages((currentMessages) => {
          if (currentMessages.length > 0) {
            const title = currentMessages.find(m => m.role === 'user')?.content.slice(0, 20) || 
                `Chat ${new Date().toLocaleDateString()}`;
            
            // Use the captured conversation ID, not the state one
            setConversations((prev) => {
              const existingIndex = prev.findIndex(c => c.id === convId);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  messages: currentMessages,
                  timestamp: new Date(),
                };
                return updated;
              } else {
                // Only add if it doesn't exist
                return [...prev, {
                  id: convId!,
                  name: title,
                  messages: currentMessages,
                  timestamp: new Date(),
                }];
              }
            });
          }
          return currentMessages;
        });
      }, 500);

    } catch (err) {
      // Type-safe error handling
      const apiError = err as ApiError;
      
      // Set error message to display to user
      setError(apiError.message || 'Failed to get response from chatbot');

      // Log error for debugging
      console.error('Error sending message:', apiError);

      // Remove the empty bot message if there was an error
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== botMessageId)
      );
    } finally {
      // Always clear loading state, whether success or failure
      setIsLoading(false);
    }
  };
  
  /**
   * Closes the error snackbar
   */
  const handleCloseError = (): void => {
    setError(null);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'row',
      width: '100%',
      }}>
      {/* Sidebar */}
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
          <Typography variant="body1">
            + New Conversation
          </Typography>
        </Box>

        <Box sx={{ mt: 4, flexGrow: 1, overflow: 'auto' }}>
          {conversations.map((conv) => (
            <Box
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              sx={{
                p: 1,
                mb: 1,
                bgcolor: conv.id === currentConversationId ? 'primary.light' : 'transparent',
                color: conv.id === currentConversationId ? 'primary.contrastText' : 'text.primary',
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
              <Typography variant="caption" color="text.secondary">
                {conv.timestamp.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Main chat area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
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
              AI Chatbot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ask me anything!
            </Typography>
          </Box>
        </Box>

        {/* Message List */}
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

        {/* Message Input */}
        <Box sx={{ mb: 4, ml: 2, mr: 2 }}>
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="Type your message..."
          />
        </Box>

        {/* Error notification */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default ChatContainer;
