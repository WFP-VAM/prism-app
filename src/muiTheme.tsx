import { createMuiTheme } from '@material-ui/core/styles';

const skyBlue: string = '#009EE0';
const greyBlue: string = '#5A686C';
const darkGreyBlue: string = '#2D3436';
const white: string = '#FFFFFF';
const lightGray = '#CCCCCC';

export const colors = { skyBlue, greyBlue, darkGreyBlue };

declare module '@material-ui/core/styles/createMuiTheme' {
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

const theme: any = createMuiTheme({
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
      main: greyBlue,
      dark: darkGreyBlue,
    },
    text: {
      primary: white,
      secondary: darkGreyBlue,
    },
    grey: {
      500: lightGray,
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
      h4: {
        fontSize: 13,
        color: darkGreyBlue,
        fontWeight: 400,
      },
      h5: {
        fontSize: 11,
        color: greyBlue,
      },
      body1: {
        color: white,
        fontSize: 13,
        fontWeight: 300,
      },
      body2: {
        fontSize: 11,
        letterSpacing: 3.5,
        color: white,
        textTransform: 'uppercase',
      },
    },
    MuiListItem: {
      button: {
        // dropdowns in Analyser Table are white on white background without this rule.
        color: 'black',
      },
    },
    MuiMenuItem: {
      root: {
        color: 'black',
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
  },
});

export default theme;
