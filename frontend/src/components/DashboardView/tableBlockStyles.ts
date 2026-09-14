import type { SxProps, Theme } from '@mui/material/styles';

export const tableBlockGrayCardSx = {
  background: '#F1F1F1',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
} satisfies SxProps<Theme>;

export const tableBlockMaxRowsInputSx = {
  width: 100,
  marginBottom: 16,
} satisfies SxProps<Theme>;

export const tableBlockPreviewContainerSx = {
  background: 'white',
  borderRadius: 8,
  padding: 16,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: 1,
  minHeight: 0,
} satisfies SxProps<Theme>;

export const tableBlockPreviewHeaderWrapperSx = {
  flexShrink: 0,
} satisfies SxProps<Theme>;

export const tableBlockPreviewTableWrapperSx = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  marginTop: 8,
} satisfies SxProps<Theme>;

export const tableBlockTitleSx = {
  fontWeight: 600,
  mb: 1,
} satisfies SxProps<Theme>;

export const tableBlockFormContainerSx = {
  background: 'white',
  borderRadius: 4,
  padding: 2,
  pt: 4,
  display: 'flex',
  flexDirection: 'column',
  mt: 1,
} satisfies SxProps<Theme>;

export const tableBlockFormSectionSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
} satisfies SxProps<Theme>;

export const tableBlockStatisticThresholdRowSx = {
  display: 'flex',
  flexDirection: 'row',
  gap: 2,
  alignItems: 'flex-start',
  '& > *': {
    flex: 1,
  },
} satisfies SxProps<Theme>;

export const tableBlockDateAnalysisRowSx = {
  display: 'flex',
  flexDirection: 'row',
  gap: 2,
  alignItems: 'flex-start',
  justifyContent: 'center',
  '& > *:first-of-type': {
    flex: 1,
  },
} satisfies SxProps<Theme>;

export const tableBlockDateColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  '& > *': {
    marginBottom: '0 !important',
  },
} satisfies SxProps<Theme>;

export const tableBlockRerunButtonSx = {
  height: 40,
  minWidth: 140,
  mb: 4,
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

export const tableBlockLoadingContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
} satisfies SxProps<Theme>;
