import type { SxProps, Theme } from '@mui/material/styles';

export const mapBlockRootSx = {
  display: 'flex',
  minHeight: 0,
  width: '100%',
  position: 'relative',
  gap: '16px',
  overflow: 'hidden',
  flex: 1,
} satisfies SxProps<Theme>;

export const mapBlockRootPreviewSx = {
  display: 'flex',
  height: '100%',
  width: '100%',
  position: 'relative',
  gap: 0,
  overflow: 'hidden',
  flex: 1,
} satisfies SxProps<Theme>;

export const mapBlockLoadingSx = {
  position: 'absolute',
  height: '100%',
  width: '100%',
  backgroundColor: 'black',
  opacity: 0.75,
  zIndex: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
} satisfies SxProps<Theme>;

export const mapBlockLeftPanelSx = {
  flex: '0 0 33.333%',
  minWidth: 0,
  overflow: 'auto',
  maxHeight: '100%',
} satisfies SxProps<Theme>;

export const mapBlockTitleInputContainerSx = {
  padding: '12px',
  marginBottom: '8px',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#fff',
} satisfies SxProps<Theme>;

export const mapBlockLegendSettingsContainerSx = {
  padding: '12px',
  marginBottom: '8px',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#fff',
} satisfies SxProps<Theme>;

export const mapBlockTitleLabelSx = {
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: 600,
} satisfies SxProps<Theme>;

export const mapBlockTitleInputRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
} satisfies SxProps<Theme>;

export const mapBlockTitleInputSx = {
  '& .MuiOutlinedInput-input': {
    padding: '8px 12px',
  },
} satisfies SxProps<Theme>;

export const mapBlockLegendToggleWrapperSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
  '& h4': {
    fontSize: '13px',
  },
} satisfies SxProps<Theme>;

export const mapBlockLegendPositionWrapperSx = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 0,
  '& h4': {
    fontSize: '13px',
    margin: 0,
    marginRight: '0.5rem',
  },
} satisfies SxProps<Theme>;

export const mapBlockToggleButtonGroupSx = {
  display: 'flex',
} satisfies SxProps<Theme>;

export const mapBlockToggleButtonSx = {
  backgroundColor: 'white',
  height: '32px',
  width: '36px',
  padding: '4px',
  fontSize: '0.8rem',
  borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
} satisfies SxProps<Theme>;

export const mapBlockRightPanelSx = {
  flex: '0 0 66.667%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const mapBlockRightPanelPreviewSx = {
  flex: '1 1 100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const mapBlockPreviewHeaderContainerSx = {
  flex: '0 0 auto',
  background: 'white',
  borderRadius: 8,
} satisfies SxProps<Theme>;

export const mapBlockMapContainerEditSx = {
  flex: '0 0 550px',
  height: '550px',
  position: 'relative',
  '& > div': {
    height: '100%',
    width: '100%',
  },
} satisfies SxProps<Theme>;

export const mapBlockMapContainerPreviewSx = {
  flex: '1',
  height: '100%',
  minHeight: 0,
  position: 'relative',
  '& > div': {
    height: '100%',
    width: '100%',
  },
} satisfies SxProps<Theme>;

export const mapBlockDateSelectorContainerSx = {
  flex: '0 0 auto',
  height: 'auto',
  width: '100%',
  '& > div': {
    position: 'relative !important',
    bottom: 'auto !important',
    width: '100% !important',
  },
  '& h3': {
    marginBottom: '8px',
  },
} satisfies SxProps<Theme>;
