import { cyanBlue, white } from 'muiTheme';

/** Filled panel action button — JSS bg loses to MUI v9 contained disabled styles without this. */
export const panelActionButtonSx = (backgroundColor: string) => ({
  '&&': {
    backgroundColor,
    color: white,
    textTransform: 'none',
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
