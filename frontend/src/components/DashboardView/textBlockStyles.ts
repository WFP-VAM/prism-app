import type { SxProps, Theme } from '@mui/material/styles';

export const textBlockGrayCardSx = {
  background: '#F1F1F1',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
} satisfies SxProps<Theme>;

export const textBlockLabelSx = {
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 12,
} satisfies SxProps<Theme>;

export const textBlockEmptyStateSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
} satisfies SxProps<Theme>;

export const textBlockTextareaSx = {
  width: '95%',
  minHeight: 120,
  padding: '12px',
  borderRadius: 4,
  fontSize: 14,
  border: 'none',
  outline: 'none',
  background: 'white',
  fontFamily: 'Roboto',
  resize: 'vertical',
} satisfies SxProps<Theme>;

export const textBlockPreviewContainerSx = {
  background: 'white',
  borderRadius: 8,
  padding: 16,
  maxWidth: '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  '& *:last-child': {
    marginBottom: 0,
  },
} satisfies SxProps<Theme>;

export const textBlockPreviewTextSx = {
  fontSize: 14,
  lineHeight: 1.6,
  margin: '0 0 12px 0',
} satisfies SxProps<Theme>;

export const textBlockPreviewHeadingSx = {
  fontWeight: 600,
  margin: '16px 0 8px 0',
  '&:first-of-type': {
    marginTop: 0,
  },
} satisfies SxProps<Theme>;
