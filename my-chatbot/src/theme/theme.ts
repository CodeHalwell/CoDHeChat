import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * Light theme configuration
 */

const lightThemeOptions: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            light: '#63a4ff',
            dark: '#004ba0',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5c8d',
            dark: '#9a0036',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        text: {
            primary: '#000000',
            secondary: '#555555',
        },
    },
    typography: {
        fontFamily: [
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
        h4: {
            fontWeight: 600,
            fontSize: '2rem',
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
    },
    shape: {
        borderRadius: 8,
    },
    spacing: 8,
};

/**
 * Dark theme configuration
 */
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',      // Lighter blue for dark backgrounds
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#ce93d8',      // Lighter purple for dark backgrounds
      light: '#f3e5f5',
      dark: '#ab47bc',
    },
    background: {
      default: '#121212',   // Very dark grey for page background
      paper: '#1e1e1e',     // Slightly lighter for components
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: lightThemeOptions.typography,
  shape: lightThemeOptions.shape,
  spacing: lightThemeOptions.spacing,
};

/**
 * Creates and returns a Material-UI theme based on the mode
 * @param mode - 'light' or 'dark' theme mode
 * @returns Material-UI theme object
 */
export const getTheme = (mode: 'dark' | 'light' ) => {
    return createTheme(
        mode === 'dark' ? darkThemeOptions : lightThemeOptions
    );
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);