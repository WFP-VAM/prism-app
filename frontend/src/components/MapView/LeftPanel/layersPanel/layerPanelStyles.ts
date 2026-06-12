import type { MenuProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { cyanBlue, lightGrey } from 'muiTheme';

/** Nested accordions + drawer: anchor positioning / scroll lock can break MUI Select menu. */
export const layerDaySelectMenuProps: Partial<MenuProps> = {
  disableScrollLock: true,
  slotProps: {
    paper: {
      sx: {
        '& .MuiMenuItem-root': {
          fontSize: 13,
          fontWeight: 300,
          whiteSpace: 'normal',
        },
      },
    },
  },
};

/** Level-1 accordion (Rainfall, Vegetation, …) */
export const layerMenuItemAccordionSx = {
  root: {
    position: 'inherit',
    bgcolor: '#FFFFFF',
  } satisfies SxProps<Theme>,
  summary: {
    bgcolor: '#FFFFFF',
    '& .MuiAccordionSummary-expandIconWrapper': {
      color: 'black',
    },
    '& .MuiAccordionSummary-content': {
      alignItems: 'center',
    },
  } satisfies SxProps<Theme>,
  details: {
    '&&': {
      p: 0,
      bgcolor: '#FFFFFF',
      opacity: 1,
    },
  } satisfies SxProps<Theme>,
  title: {
    color: 'black',
    fontSize: '14px',
    fontWeight: 600,
  } satisfies SxProps<Theme>,
  chip: {
    ml: '3%',
  } satisfies SxProps<Theme>,
};

/** Level-2 accordion (INAM Rainfall Data, Forecasts, …) */
export const menuSwitchAccordionSx = {
  root: {
    position: 'inherit',
    maxWidth: '100%',
  } satisfies SxProps<Theme>,
  summary: {
    bgcolor: lightGrey,
    '& .MuiAccordionSummary-expandIconWrapper': {
      color: 'black',
    },
    '& .MuiAccordionSummary-content': {
      alignItems: 'center',
    },
  } satisfies SxProps<Theme>,
  details: {
    '&&': {
      p: 0,
      bgcolor: '#FFFFFF',
      opacity: 1,
    },
  } satisfies SxProps<Theme>,
  title: {
    color: 'black',
    fontSize: '14px',
    fontWeight: 400,
  } satisfies SxProps<Theme>,
  chip: {
    ml: '1.5%',
  } satisfies SxProps<Theme>,
};

/** Inline day/period picker next to layer title — v4 was borderless standard Select */
export const layerDaySelectSx = (selected: boolean): SxProps<Theme> => ({
  ml: '5px',
  flexShrink: 0,
  minWidth: 0,
  alignSelf: 'center',
  fontSize: 13,
  fontWeight: 300,
  color: selected ? 'black' : 'text.secondary',
  bgcolor: 'transparent',
  // v4 classes.select — Input root merges with Select in MUI v9
  '&::before, &::after': {
    display: 'none !important',
    borderBottom: 'none !important',
  },
  '&.Mui-focused::before, &.Mui-focused::after': {
    display: 'none !important',
  },
  '& .MuiSelect-select': {
    py: 0,
    px: 0,
    pr: '20px !important',
    minHeight: 'unset',
    lineHeight: 1.8,
    whiteSpace: 'normal',
    bgcolor: 'transparent !important',
    '&:focus': {
      bgcolor: 'transparent',
    },
  },
  '& .MuiSelect-icon': {
    color: selected ? 'black' : 'action.active',
    right: 0,
    top: 'calc(50% - 0.35em)',
  },
});

export const layerDaySelectTitleSx = (
  selected: boolean,
  disabled: boolean,
): SxProps<Theme> => ({
  lineHeight: 1.8,
  fontSize: '14px',
  fontWeight: 400,
  color: selected ? 'black' : 'inherit',
  cursor: disabled ? 'default' : 'pointer',
  '&:focus': { outline: 'none' },
});

export const switchItemOpacityButtonSx = (
  selected: boolean,
): SxProps<Theme> => ({
  ml: 'auto',
  ...(selected
    ? {
        bgcolor: '#4CA1AD',
        color: '#F2F2F2',
        '&:hover': {
          bgcolor: '#4CA1AD',
          color: '#4CA1AD',
        },
      }
    : {}),
});

export const compositeLayersContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  ml: '24px',
  mb: '12px',
  fontStyle: 'italic',
  borderLeft: '1px #B1D6DB solid',
} satisfies SxProps<Theme>;

export const opacitySliderSx = {
  text: {
    color: '#4CA1AD',
    mb: '10px',
  } satisfies SxProps<Theme>,
  root: {
    color: '#4CA1AD',
    height: 8,
    '& .MuiSlider-thumb': {
      bgcolor: '#4CA1AD',
    },
  } satisfies SxProps<Theme>,
};

const activeLayerChipSx = (marginLeft: string): SxProps<Theme> => ({
  '&&': {
    ml: marginLeft,
    bgcolor: cyanBlue,
    color: 'black',
  },
});

export const selectedLayersChipSx = activeLayerChipSx('3%');
export const activeLayersCountChipSx = activeLayerChipSx('1.5%');

/** Analysis result layer row in layers panel */
export const analysisLayerSwitchItemSx = {
  root: {
    bgcolor: '#FFFFFF',
  } satisfies SxProps<Theme>,
  title: (selected: boolean): SxProps<Theme> => ({
    lineHeight: 1.8,
    fontWeight: 400,
    ...(selected ? { color: 'black' } : {}),
  }),
  switch: {
    mr: '2px',
    '& .MuiSwitch-track': {
      bgcolor: '#E0E0E0',
    },
    '& .MuiSwitch-switchBase': {
      color: '#E0E0E0',
      '&.Mui-checked': {
        color: '#53888F',
      },
      '&.Mui-checked + .MuiSwitch-track': {
        bgcolor: '#B1D6DB',
      },
    },
  } satisfies SxProps<Theme>,
};
