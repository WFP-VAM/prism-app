import type { SxProps, Theme } from '@mui/material/styles';

export const importDashboardRootSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'calc(100vh - 56px)',
  background: '#F8F8F8',
} satisfies SxProps<Theme>;

export const importDashboardCardSx = {
  background: 'white',
  borderRadius: 8,
  p: 4,
  width: 480,
  maxWidth: '90vw',
  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
} satisfies SxProps<Theme>;

export const importDashboardTitleSx = {
  fontWeight: 600,
} satisfies SxProps<Theme>;

export const importDashboardSubtitleSx = {
  color: 'text.secondary',
  '& strong': {
    fontWeight: 700,
  },
} satisfies SxProps<Theme>;

export const importDashboardDropZoneSx = {
  border: 2,
  borderStyle: 'dashed',
  borderColor: 'divider',
  borderRadius: 8,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
  '&:hover': {
    borderColor: 'primary.main',
    background: '#F0F7FF',
  },
} satisfies SxProps<Theme>;

export const importDashboardDropZoneDraggingSx = {
  borderColor: 'primary.main',
  background: '#F0F7FF',
} satisfies SxProps<Theme>;

export const importDashboardUploadIconSx = {
  fontSize: 48,
  color: 'text.secondary',
  mb: 0.5,
} satisfies SxProps<Theme>;

export const importDashboardDropTextSx = {
  fontWeight: 500,
} satisfies SxProps<Theme>;

export const importDashboardBrowseButtonSx = {
  mt: 1,
  '& span': {
    textTransform: 'none',
  },
} satisfies SxProps<Theme>;

export const importDashboardErrorSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  p: 1.5,
  background: '#FFF3F3',
  border: 1,
  borderColor: 'error.light',
  borderRadius: 6,
  color: 'error.dark',
} satisfies SxProps<Theme>;

export const importDashboardErrorHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
} satisfies SxProps<Theme>;

export const importDashboardErrorHeadlineSx = {
  fontWeight: 600,
  color: 'error.dark',
} satisfies SxProps<Theme>;

export const importDashboardErrorIconSx = {
  fontSize: 18,
  flexShrink: 0,
  color: 'error.dark',
} satisfies SxProps<Theme>;

export const importDashboardErrorDetailSx = {
  fontSize: '0.8rem',
  color: 'error.dark',
  pl: 3.25,
} satisfies SxProps<Theme>;

export const importDashboardFeedbackContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  py: 2,
  textAlign: 'center',
} satisfies SxProps<Theme>;

export const importDashboardFeedbackTextSx = {
  color: 'text.secondary',
} satisfies SxProps<Theme>;

export const importDashboardSuccessIconSx = {
  fontSize: 56,
  color: 'success.main',
} satisfies SxProps<Theme>;

export const importDashboardCtaButtonSx = {
  mt: 1,
  '& span': {
    textTransform: 'none',
  },
} satisfies SxProps<Theme>;
