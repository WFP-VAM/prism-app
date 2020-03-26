import { createMuiTheme } from '@material-ui/core/styles';

const greyBlue: string = '#5A686C';
const darkGreyBlue: string = '#2D3436';
const white: string = '#FFFFFF';

const theme: any = createMuiTheme({
  palette: {
    primary: {
      main: greyBlue,
      dark: darkGreyBlue,
    },
    text: {
      primary: white,
    },
  },
  overrides: {
    MuiToolbar: {
      dense: {
        minHeight: 40,
      },
    },
    MuiTypography: {
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
  },
});

export default theme;
