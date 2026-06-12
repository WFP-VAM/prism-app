import type { SxProps, Theme } from '@mui/material/styles';
import { PanelSize } from 'config/types';

export const chartsPanelParamsSx: SxProps<Theme> = {
  marginTop: '30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: PanelSize.medium,
  flexShrink: 0,
};

export const chartsPanelParamsCompactSx: SxProps<Theme> = {
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: PanelSize.medium,
  flexShrink: 0,
};

export const chartsFormGroupSx: SxProps<Theme> = {
  marginBottom: '20px',
  marginLeft: '20px',
  width: '100%',
};

export const chartsLayerFormControlSx: SxProps<Theme> = {
  marginTop: '30px',
  marginBottom: '2em',
  minWidth: 300,
  maxWidth: 350,
  width: '100%',
};

export const chartsTextLabelSx: SxProps<Theme> = {
  color: 'black',
};

export const chartsContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  width: '100%',
};

export const chartsPanelChartsSx: SxProps<Theme> = {
  alignContent: 'start',
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  flexGrow: 4,
  gap: '16px',
  padding: '16px',
  marginTop: 0,
  paddingBottom: '1em',
};

export const compareSwitchSx: SxProps<Theme> = {
  marginRight: '2px',
  marginBottom: '10px',
  '& .MuiSwitch-switchBase': {
    color: '#E0E0E0',
    '&.Mui-checked': {
      color: '#53888F',
    },
    '&.Mui-checked + .MuiSwitch-track': {
      backgroundColor: '#B1D6DB',
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: '#E0E0E0',
  },
};

export const compareSwitchTitleSx: SxProps<Theme> = {
  lineHeight: 1.8,
  color: 'black',
  fontWeight: 400,
};

export const compareSwitchTitleUncheckedSx: SxProps<Theme> = {
  lineHeight: 1.8,
  fontWeight: 400,
};

export const chartSectionLoadingSx: SxProps<Theme> = {
  height: 240,
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export const chartSectionErrorContainerSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  height: '100%',
};

export const dateSliderContainerSx: SxProps<Theme> = {
  width: 'calc(100% - 4rem)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingTop: '1rem',
  paddingBottom: '2rem',
};

export const locationSelectorWrapperSx: SxProps<Theme> = {
  marginLeft: '20px',
  marginTop: '20px',
};

export const locationSelectorWrapperLabelSx: SxProps<Theme> = {
  color: 'black',
  fontWeight: 'bold',
};

export const locationSelectorRemoveAdminSx: SxProps<Theme> = {
  fontWeight: 'bold',
};

export const locationSelectorSelectRootSx: SxProps<Theme> = {
  marginBottom: '30px',
  color: 'black',
  minWidth: '300px',
  maxWidth: '350px',
  width: 'auto',
  '& label': {
    color: '#333333',
  },
  '& .MuiInputBase-root': {
    '&:hover fieldset': {
      borderColor: '#333333',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#333333',
    },
  },
};

export const timePeriodCalendarPopperClass =
  'charts-time-period-calendar-popper';

export const timePeriodWrapperSx: SxProps<Theme> = {
  marginTop: '20px',
  paddingLeft: '20px',
  paddingRight: '20px',
};

export const timePeriodWrapperLabelSx: SxProps<Theme> = {
  color: 'black',
  fontWeight: 'bold',
};

export const timePeriodDatePickerContainerSx: SxProps<Theme> = {
  marginTop: '5px',
  width: 'auto',
  color: 'black',
  display: 'flex',
  minWidth: 300,
  justifyContent: 'space-between',
};

export const timePeriodTextLabelSx: SxProps<Theme> = {
  color: 'black',
};
