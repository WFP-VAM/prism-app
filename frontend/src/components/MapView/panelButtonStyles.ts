import { cyanBlue, white } from 'muiTheme';

/** Filled panel action button — JSS bg loses to MUI v9 contained disabled styles without this. */
export const panelActionButtonSx = (backgroundColor: string) => ({
  '&&': {
    backgroundColor,
    color: white,
    // Match legacy body2 button label styling (uppercase, spaced, 11px)
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 3.5,
    '&:hover': {
      backgroundColor,
    },
    '&.Mui-disabled': {
      backgroundColor,
      color: white,
      opacity: 0.5,
    },
  },
});

export const downloadButtonSx = panelActionButtonSx(cyanBlue);
export const clearAllButtonSx = panelActionButtonSx('#788489');
