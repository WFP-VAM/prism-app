import type { SxProps, Theme } from '@mui/material/styles';

export const blockPreviewHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  mb: 2,
  gap: 1,
} satisfies SxProps<Theme>;

export const blockPreviewLeftColumnSx = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  flex: '1 1 auto',
  minWidth: 0,
  gap: 1,
} satisfies SxProps<Theme>;

export const blockPreviewTitleSx = {
  fontWeight: 'bold',
  wordWrap: 'break-word',
  flex: '0 1 auto',
} satisfies SxProps<Theme>;

export const blockPreviewSubtitleSx = {
  fontSize: '0.875rem',
  wordWrap: 'break-word',
  flex: '0 1 auto',
} satisfies SxProps<Theme>;

export const blockPreviewDownloadActionsSx = {
  display: 'flex',
  alignItems: 'center',
  flex: '0 0 auto',
  flexShrink: 0,
} satisfies SxProps<Theme>;
