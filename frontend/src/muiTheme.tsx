import { createTheme } from '@mui/material/styles';
import React from 'react';

const skyBlue: string = '#009EE0';
const greyBlue: string = '#5A686C';
const darkGreyBlue: string = '#2D3436';
export const white = '#FFFFFF';
const midnightSlate = '#323638';
export const borderGray = '#A4A4A4';
export const lightGrey = '#F1F1F1';
export const grey = '#CCCCCC';
export const black = '#101010';
export const cyanBlue = '#63B2BD';

export const colors = { skyBlue, greyBlue, darkGreyBlue };

declare module '@mui/material/styles' {
  interface Theme {
    dialog?: {
      border?: React.CSSProperties['color'];
      actionButton?: React.CSSProperties['color'];
    };
    surfaces?: {
      dark?: React.CSSProperties['color'];
      light?: React.CSSProperties['color'];
    };
    pdf?: {
      secondaryTextColor?: React.CSSProperties['color'];
      legendsBackgroundColor?: React.CSSProperties['color'];
      table?: {
        borderColor?: React.CSSProperties['color'];
        darkRowColor?: React.CSSProperties['color'];
        lightRowColor?: React.CSSProperties['color'];
      };
      fontSizes: {
        large?: number;
        medium?: number;
        small?: number;
        extraSmall?: number;
      };
    };
  }

  interface ThemeOptions {
    dialog?: {
      border?: React.CSSProperties['color'];
      actionButton?: React.CSSProperties['color'];
    };
    surfaces?: {
      dark?: React.CSSProperties['color'];
      light?: React.CSSProperties['color'];
    };
    pdf?: {
      secondaryTextColor?: React.CSSProperties['color'];
      legendsBackgroundColor?: React.CSSProperties['color'];
      table?: {
        borderColor?: React.CSSProperties['color'];
        darkRowColor?: React.CSSProperties['color'];
        lightRowColor?: React.CSSProperties['color'];
      };
      fontSizes?: {
        large?: number;
        medium?: number;
        small?: number;
        extraSmall?: number;
      };
    };
  }
}

/**
 * Base theme for light-surface panels (layers, charts, tables, dialogs).
 * Dark AppBar chrome is styled locally in NavBar sx — not via global overrides.
 */
const theme = createTheme({
  typography: {
    fontFamily:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
    h2: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 16,
      fontWeight: 400,
    },
    h4: {
      fontSize: 13,
      fontWeight: 400,
    },
    h5: {
      fontSize: 11,
    },
    body1: {
      fontSize: 13,
      fontWeight: 300,
    },
    body2: {
      fontSize: 11,
      letterSpacing: 3.5,
      textTransform: 'uppercase',
    },
  },
  dialog: {
    border: '#2E6EAF',
    actionButton: '#6F9FD2',
  },
  surfaces: {
    dark: '#3d474a',
    light: '#5A686C',
  },
  pdf: {
    secondaryTextColor: '#929292',
    legendsBackgroundColor: '#F9F9F9',
    table: {
      borderColor: '#C1C1C1',
      darkRowColor: '#EBEBEB',
      lightRowColor: '#F5F5F5',
    },
    fontSizes: {
      large: 10.78,
      medium: 9.24,
      small: 7.7,
      extraSmall: 6.14,
    },
  },
  palette: {
    primary: {
      main: midnightSlate,
      dark: darkGreyBlue,
      contrastText: white,
    },
    // MUI v4 default — Layers nav badge used color="secondary"
    secondary: {
      main: '#f50057',
      contrastText: white,
    },
    text: {
      primary: black,
      secondary: greyBlue,
    },
    grey: {
      500: grey,
    },
  },
  spacing: 6,
  components: {
    MuiToolbar: {
      styleOverrides: {
        dense: {
          minHeight: 40,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: black,
        },
        h5: {
          color: greyBlue,
        },
      },
      variants: [
        {
          props: { color: 'secondary' },
          style: {
            color: white,
          },
        },
      ],
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: black,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: black,
          paddingLeft: 25,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          '&.Mui-expanded': {
            margin: 0,
            '&:before': {
              opacity: 1,
            },
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: '2.5rem',
          '&.Mui-expanded': {
            minHeight: '2.5rem',
          },
        },
        content: {
          margin: 0,
          '&.Mui-expanded': {
            margin: 0,
          },
        },
        expandIconWrapper: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          marginLeft: '12px',
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          pointerEvents: 'none',
          padding: '10px',
        },
        sticky: {
          backgroundColor: 'white',
        },
      },
    },
    MuiTableSortLabel: {
      styleOverrides: {
        icon: {
          color: black,
        },
        root: {
          textTransform: 'none',
          letterSpacing: 'normal',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          textTransform: 'none',
          letterSpacing: 'normal',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          textTransform: 'none',
          letterSpacing: 'normal',
        },
        selectLabel: {
          textTransform: 'none',
          letterSpacing: 'normal',
        },
        displayedRows: {
          textTransform: 'none',
          letterSpacing: 'normal',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            pointerEvents: 'auto',
          },
          borderRadius: '4px',
        },
        startIcon: {
          marginLeft: 0,
        },
        text: {
          padding: '6px 12px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: black,
          fontSize: '1rem',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: black,
          fontSize: '1rem',
        },
        root: {
          color: black,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          fontSize: '1rem',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          color: black,
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: `${cyanBlue} !important`,
            color: 'initial',
          },
        },
      },
    },
  },
});

export default theme;
