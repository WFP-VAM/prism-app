import type { SxProps, Theme } from '@mui/material/styles';

export const dashboardExportPreviewContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  overflow: 'auto',
  backgroundColor: '#E0E0E0',
} satisfies SxProps<Theme>;

export const dashboardExportPreviewWrapperSx = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: 24,
  minHeight: '100%',
  minWidth: 'fit-content',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const dashboardExportContentSx = {
  backgroundColor: '#F8F8F8',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const dashboardExportDialogContentSx = {
  fontFamily: 'Roboto',
  scrollbarGutter: 'stable',
  display: 'flex',
  gap: '1rem',
  flexDirection: 'row',
  justifyContent: 'space-between',
} satisfies SxProps<Theme>;

export const toggleSelectorWrapperSx = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
  '& h4': {
    fontSize: '14px',
    margin: 0,
  },
} satisfies SxProps<Theme>;

export const toggleSelectorButtonGroupSx = {
  display: 'flex',
  flexWrap: 'wrap',
} satisfies SxProps<Theme>;

export const toggleSelectorButtonSx = {
  backgroundColor: 'white',
  height: '32px',
  width: '36px',
  padding: '4px',
  fontSize: '0.8rem',
  borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
} satisfies SxProps<Theme>;

export const dashboardExportConfigContainerSx = {
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  gap: '0.5rem',
  minHeight: '740px',
  scrollbarGutter: 'stable',
  overflow: 'auto',
  zIndex: 4,
  backgroundColor: 'white',
} satisfies SxProps<Theme>;

export const dashboardExportConfigTitleSx = {
  fontSize: 14,
  fontWeight: 900,
  marginBottom: '1em',
  color: 'text.secondary',
} satisfies SxProps<Theme>;

export const dashboardExportConfigCloseButtonSx = {
  position: 'absolute',
  right: 8,
  top: 8,
} satisfies SxProps<Theme>;

export const dashboardExportConfigOptionWrapSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  marginBottom: '0.5rem',
} satisfies SxProps<Theme>;

export const dashboardExportConfigGutterSx = {
  marginTop: 16,
  marginBottom: 10,
} satisfies SxProps<Theme>;

export const dashboardExportCollapsibleWrapperSx = {
  display: 'flex',
  alignItems: 'center',
  '& h4': {
    fontSize: '14px',
  },
} satisfies SxProps<Theme>;

export const dashboardExportCollapsibleWrapperExpandedSx = {
  marginBottom: '0.25rem',
} satisfies SxProps<Theme>;

export const dashboardExportFormControlSx = {
  width: '100%',
  '& > .MuiInputLabel-shrink': { display: 'none' },
  '& > .MuiInput-root': { margin: 0 },
  '& label': {
    color: '#000000',
    opacity: 0.6,
    fontSize: '14px',
    marginLeft: '10px',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
  },
} satisfies SxProps<Theme>;
