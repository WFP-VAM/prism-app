import type { SxProps, Theme } from '@mui/material/styles';
import { black } from 'muiTheme';

export const legendTriggerButtonSx = {
  height: '2.5em',
} satisfies SxProps<Theme>;

export const legendIconSx = {
  color: 'white',
  fontSize: '1.5rem',
} satisfies SxProps<Theme>;

/** Floating legend stack — must beat MuiList-root position:relative */
export const legendListSx = {
  '&&': {
    position: 'fixed',
    right: '1rem',
    top: 'calc(56px + 16px)',
    overflowX: 'hidden',
    overflowY: 'auto',
    maxHeight: '78vh',
    zIndex: 1100,
    pointerEvents: 'auto',
  },
} satisfies SxProps<Theme>;

export const legendItemPaperSx = {
  '&&': {
    p: '8px',
    width: 180,
    borderRadius: '8px',
  },
} satisfies SxProps<Theme>;

/** h5 grey comes from theme; only reset default margins */
export const legendBodyTextSx = {
  m: 0,
} satisfies SxProps<Theme>;

export const legendCoverageTextSx = {
  mt: '8px',
  mb: 0,
} satisfies SxProps<Theme>;

export const legendItemActionsSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  '& .MuiIconButton-root': {
    color: black,
    '&:hover': {
      bgcolor: 'rgba(0, 0, 0, 0.04)',
    },
  },
} satisfies SxProps<Theme>;

const loadingBarBaseSx = {
  '&&': {
    marginTop: '5px',
    marginBottom: '5px',
    height: 2,
  },
} satisfies SxProps<Theme>;

export const loadingBarVisibleSx: SxProps<Theme> = {
  ...loadingBarBaseSx,
  '& .MuiLinearProgress-bar1, & .MuiLinearProgress-bar2': {
    opacity: 0.8,
  },
};

export const loadingBarHiddenSx: SxProps<Theme> = {
  ...loadingBarBaseSx,
  '& .MuiLinearProgress-bar1, & .MuiLinearProgress-bar2': {
    opacity: 0,
  },
};

export const legendLinkSx = {
  textDecoration: 'underline',
} satisfies SxProps<Theme>;

export const legendOpacitySliderSx = {
  root: {
    color: '#4CA1AD',
    flexGrow: 1,
    py: '18px',
  } satisfies SxProps<Theme>,
  thumb: {
    bgcolor: '#4CA1AD',
  } satisfies SxProps<Theme>,
  text: {
    color: '#4CA1AD',
    mr: '5px',
    width: 28,
    lineHeight: '36px',
  } satisfies SxProps<Theme>,
  box: {
    bgcolor: 'white',
    width: 172,
    overflow: 'hidden',
  } satisfies SxProps<Theme>,
};
