import type { SxProps, Theme } from '@mui/material/styles';

export const dateSelectorContainerSx = {
  position: 'absolute',
  bottom: '1.5rem',
  width: '100%',
} satisfies SxProps<Theme>;

export const datePickerContainerSx = {
  border: '1px solid #D4D4D4',
  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  bgcolor: 'white',
  color: '#101010',
  borderRadius: '8px',
  width: '90%',
  margin: 'auto',
  textAlign: 'center',
} satisfies SxProps<Theme>;

export const datePickerContainerDashboardSx = {
  ...datePickerContainerSx,
  boxShadow: 'none',
  width: 'calc(100% - 16px)',
} satisfies SxProps<Theme>;

export const datePickerGridSx = {
  display: 'flex',
  minWidth: 150,
  justifyContent: 'center',
  alignSelf: 'center',
  alignItems: 'center',
  flexShrink: 0,
} satisfies SxProps<Theme>;

export const datePickerGridMobileSx = {
  mb: 1,
} satisfies SxProps<Theme>;

export const dateSelectorChevronSx = {
  '&&': {
    p: 0,
    minWidth: '24px',
    mb: 'auto',
    mt: 'auto',
    mr: '10px',
    ml: '10px',
    color: '#101010',
  },
  '&:hover': {
    bgcolor: 'rgba(211,211,211, 0.3)',
  },
} satisfies SxProps<Theme>;

export const dateSelectorSliderSx = {
  display: 'flex',
} satisfies SxProps<Theme>;

export const dateContainerSx = {
  position: 'relative',
  height: 54,
  flexGrow: 1,
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const dateLabelContainerSx = {
  position: 'absolute',
  flexWrap: 'nowrap',
} satisfies SxProps<Theme>;

export const timelineSx = {
  position: 'absolute',
  top: 8,
  touchAction: 'pan-x',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
} satisfies SxProps<Theme>;

export const pointerSx = {
  position: 'absolute',
  zIndex: 5,
  marginTop: '22px',
  left: -11,
  height: '16px',
  cursor: 'grab',
} satisfies SxProps<Theme>;
