import type { SxProps, Theme } from '@mui/material/styles';

export const chartBlockGrayCardSx = {
  background: '#F1F1F1',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
} satisfies SxProps<Theme>;

export const chartBlockPreviewContainerSx = {
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

export const chartBlockTitleSx = {
  fontWeight: 600,
  mb: 1,
} satisfies SxProps<Theme>;

export const chartBlockFormContainerSx = {
  background: 'white',
  borderRadius: 4,
  padding: 2,
  pt: 4,
  display: 'flex',
  flexDirection: 'column',
  mt: 1,
} satisfies SxProps<Theme>;

export const chartBlockFormSectionSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
} satisfies SxProps<Theme>;

export const chartBlockLayerSelectorRowSx = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 2,
  width: '100%',
} satisfies SxProps<Theme>;

export const chartBlockLayerSelectorFlexSx = {
  flex: 1,
  marginBottom: 0,
} satisfies SxProps<Theme>;

export const chartBlockDateRangeLabelSx = {
  fontWeight: 600,
  color: 'black',
  paddingTop: 9,
  flexShrink: 0,
  mr: 1,
  ml: 10,
  mb: 0.5,
} satisfies SxProps<Theme>;

export const chartBlockLatestPeriodRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: 1,
  ml: 10,
  width: '90%',
  mb: 1,
} satisfies SxProps<Theme>;

export const chartBlockPeriodControlSx = {
  flex: '1 1 140px',
  minWidth: 140,
  marginBottom: 0,
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

export const chartBlockRerunRowSx = {
  display: 'flex',
  flexDirection: 'row',
  gap: 2,
  alignItems: 'flex-end',
  justifyContent: 'center',
  '& > *:first-of-type': {
    flex: 1,
  },
} satisfies SxProps<Theme>;

export const chartBlockRerunButtonSx = {
  height: 40,
  minWidth: 140,
  mb: 4,
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

export const chartBlockPreviewSectionSx = {
  mt: 2,
} satisfies SxProps<Theme>;

export const chartBlockLoadingContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
  flex: 1,
} satisfies SxProps<Theme>;

export const chartBlockErrorContainerSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 4,
  flex: 1,
} satisfies SxProps<Theme>;

export const chartBlockChartWrapperSx = {
  flex: 1,
  maxWidth: '100%',
  position: 'relative',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  '& > *': {
    maxWidth: '100%',
  },
} satisfies SxProps<Theme>;

export const chartBlockConstrainedChartWrapperSx = {
  flex: 1,
  maxWidth: '100%',
  position: 'relative',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  '& > *': {
    maxWidth: '100%',
  },
} satisfies SxProps<Theme>;

export const chartBlockEmptyStateSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
  minHeight: 200,
} satisfies SxProps<Theme>;

export const chartBlockSmallChartWrapperSx = {
  height: 240,
  display: 'flex',
  flexDirection: 'column',
} satisfies SxProps<Theme>;

export const chartBlockSmallLoadingContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 3,
  height: 240,
} satisfies SxProps<Theme>;

export const chartBlockSmallErrorContainerSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 3,
  height: 240,
} satisfies SxProps<Theme>;

export const chartBlockSmallEmptyStateSx = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: 240,
  textAlign: 'center',
} satisfies SxProps<Theme>;

export const chartBlockFormControlSx = {
  width: '90%',
  ml: 10,
  mb: 1,
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
