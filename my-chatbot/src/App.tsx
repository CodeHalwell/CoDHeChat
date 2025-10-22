// src/App.tsx
import { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline, IconButton, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import ChatContainer from './components/ChatContainer';
import { getTheme } from './theme/theme';
import { initializeConnection, closeConnection } from './services/chatService';

/**
 * Main App component
 * Provides theme context and dark mode toggle functionality
 * 
 * @component
 */
function App() {
  // State for theme mode (light or dark)
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  /**
   * Initialize WebSocket connection on component mount
   */
  useEffect(() => {
    initializeConnection();

    // Cleanup: close connection on component unmount
    return () => {
      closeConnection();
    };
  }, []);

  /**
   * Memoize the theme to prevent unnecessary recalculations
   * Only recreate theme when mode changes
   */
  const theme = useMemo(() => getTheme(mode), [mode]);

  /**
   * Toggle between light and dark mode
   */
  const toggleTheme = (): void => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline provides consistent baseline styles across browsers */}
      <CssBaseline />
      
      <Box sx={{ position: 'relative', minHeight: '100vh' }}>
        {/* Dark mode toggle button */}
        <IconButton
          onClick={toggleTheme}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1000,
          }}
          aria-label="toggle dark mode"
        >
          {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>

        {/* Main chat interface */}
        <ChatContainer />
      </Box>
    </ThemeProvider>
  );
}

export default App;
