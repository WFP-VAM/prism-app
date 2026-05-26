import { createTheme } from '@material-ui/core/styles';
import React from 'react';

const skyBlue: string = '#009EE0';
const greyBlue: string = '#5A686C';
const darkGreyBlue: string = '#2D3436';
const white = '#FFFFFF';
const midnightSlate = '#323638';
export const borderGray = '#A4A4A4';
export const lightGrey = '#F1F1F1';
export const grey = '#CCCCCC';
export const black = '#101010';
export const cyanBlue = '#63B2BD';

export const colors = { skyBlue, greyBlue, darkGreyBlue };

declare module '@material-ui/core/styles/createTheme' {
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
      table: {
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
}

const theme: any = createTheme({
  typography: {
    fontFamily:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
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
    },
    text: {
      primary: white,
      secondary: black,
    },
    grey: {
      500: grey,
    },
  },
  spacing: 6,
  overrides: {
    MuiToolbar: {
      dense: {
        minHeight: 40,
      },
    },
    MuiTypography: {
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
        color: greyBlue,
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
      root: {
        color: black,
      },
      colorSecondary: {
        color: white,
      },
    },
    MuiListItem: {
      button: {
        // dropdowns in Analyser Table are white on white background without this rule.
        color: black,
      },
    },
    MuiMenuItem: {
      root: {
        color: black,
        paddingLeft: 25,
      },
    },
    MuiAccordion: {
      root: {
        '&$expanded': {
          margin: 0, // remove additional padding when expanded
          '&:before': {
            opacity: 1, // to keep the border when expanded
          },
        },
      },
    },
    MuiAccordionSummary: {
      root: {
        backgroundColor: greyBlue,
        minHeight: 56,
        '&$expanded': {
          minHeight: 56,
        },
      },
      content: {
        '&$expanded': {
          margin: '12px 0px', // keep height the same before/after expanded
        },
      },
    },
    MuiAccordionDetails: {
      root: {
        backgroundColor: darkGreyBlue,
        opacity: 0.9,
        padding: 16,
      },
    },
    // For <Select/> subheadings
    MuiListSubheader: {
      root: {
        pointerEvents: 'none',
        padding: 10,
      },
      sticky: {
        backgroundColor: 'white',
      },
    },
    MuiFormLabel: {
      root: {
        // Make form label white since we normally have a dark background.
        color: 'white',
      },
    },
    MuiTableSortLabel: {
      root: {
        color: white,
        '&:hover': {
          color: white,
          opacity: 0.5,
        },
        '&$active': {
          '&& $icon': {
            opacity: 1,
            color: white,
          },
        },
      },
      icon: {
        color: white,
        opacity: 0.2,
        '&:hover': {
          opacity: 0.5,
        },
      },
    },
    MuiButton: {
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
    MuiIconButton: {
      root: {
        color: black,
      },
    },
    MuiInputLabel: {
      root: {
        color: black,
      },
    },
    MuiInputBase: {
      input: {
        color: black,
      },
      root: {
        color: black,
      },
    },
  },
});

theme.overrides.MuiToggleButton = {
  root: {
    textTransform: 'none',
    color: black,
    '&.Mui-selected, &.Mui-selected:hover': {
      backgroundColor: `${cyanBlue} !important`,
      color: 'initial',
    },
  },
};

theme.overrides.MuiTableSortLabel = {
  icon: {
    color: black,
  },
};

theme.overrides.MuiAccordionSummary = {
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
  expandIcon: {
    paddingTop: 0,
    paddingBottom: 0,
  },
};

theme.overrides.MuiAccordionDetails = {
  root: {
    marginLeft: '12px',
  },
};

export default theme;
