import type { SxProps, Theme } from '@mui/material/styles';

/** sx spacing props use theme.spacing(); v4 JSS used literal px */
const spacingPx = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

export const colorBlackSx = {
  color: 'black',
} satisfies SxProps<Theme>;

export const formContainerSx = (
  marginBottom: number | string = 30,
): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: spacingPx(marginBottom),
  marginLeft: '10px',
  width: '90%',
  color: 'black',
});

export const analysisPanelParamTextSx = {
  width: '100%',
  color: 'black',
} satisfies SxProps<Theme>;

export const chartPanelParamTextSx = {
  width: '100%',
  color: 'black',
  '&.MuiInput-underline:before': {
    borderBottomColor: 'rgba(0, 0, 0, 0.42)',
  },
  '&.MuiInput-underline:hover:before': {
    borderBottomColor: 'rgba(0, 0, 0, 0.87)',
  },
} satisfies SxProps<Theme>;

export const CALENDAR_POPPER_CLASS = 'prism-form-calendar-popper';

/** Above analysis table container (theme.zIndex.modal + 1 = 1301). */
export const CALENDAR_POPPER_Z_INDEX = 1302;

export const selectRootSx = {
  flex: 1,
  color: 'black',
  '& .MuiFormLabel-root': {
    color: 'black',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#333333',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#333333',
  },
  '& .MuiSelect-select': {
    color: 'black',
  },
} satisfies SxProps<Theme>;

export const chartFormControlSx = {
  width: '100%',
  '& .MuiFormLabel-root': {
    color: 'black',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#333333',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#333333',
  },
} satisfies SxProps<Theme>;

export const dropdownFullWidthSx = {
  width: '100%',
  color: 'black',
  // Stretch the LayerDropdown's FormControl to fill the wrapper (legacy
  // classes.dropdown width:100% was lost in the MUI migration)
  '& .MuiFormControl-root': { width: '100%' },
} satisfies SxProps<Theme>;
