import type { SxProps, Theme } from '@mui/material/styles';

import { GAP } from './useColumnHeightManagement';

export const dashboardContentRootSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  maxHeight: '100%',
} satisfies SxProps<Theme>;

export const dashboardContentBlockLabelSx = {
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 12,
} satisfies SxProps<Theme>;

export const dashboardContentBlockTypeRowSx = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: 12,
  gap: 8,
  '& .MuiTypography-h3': {
    marginBottom: 0,
  },
} satisfies SxProps<Theme>;

export const dashboardContentUseLatestCheckboxSx = {
  margin: 0,
  flexShrink: 0,
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

export const dashboardContentBlockTypeRowActionsSx = {
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
  gap: 8,
} satisfies SxProps<Theme>;

export const dashboardContentRemoveBlockButtonSx = {
  color: '#757575',
  '&:hover': {
    color: '#212121',
  },
} satisfies SxProps<Theme>;

export const dashboardContentMapHeaderActionsSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  marginLeft: 'auto',
} satisfies SxProps<Theme>;

export const dashboardContentMapHeaderUseLatestCheckboxSx = {
  margin: 0,
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

export const dashboardContentBlockTypeSelectSx = {
  fontSize: 14,
  fontWeight: 500,
  background: 'white',
  borderRadius: 4,
  padding: '2px 8px',
  '& .MuiSelect-root': {
    paddingTop: 4,
    paddingBottom: 4,
  },
} satisfies SxProps<Theme>;

export const dashboardContentContentColumnSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: GAP,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const dashboardContentDynamicColumnLayoutSx = {
  display: 'flex',
  padding: 16,
  margin: '0 16px 16px 16px',
  gap: GAP,
  flex: 1,
  overflow: 'auto',
  paddingBottom: 80,
} satisfies SxProps<Theme>;

export const dashboardContentDynamicColumnPreviewLayoutSx = {
  display: 'flex',
  padding: 0,
  margin: 0,
  gap: GAP,
  flex: 1,
  overflow: 'hidden',
  minHeight: 0,
} satisfies SxProps<Theme>;

export const dashboardContentPreviewContainerSx = {
  background: 'white',
  borderRadius: 8,
  padding: 16,
} satisfies SxProps<Theme>;

export const dashboardContentGrayCardSx = {
  background: '#F1F1F1',
  borderRadius: 8,
  marginBottom: 16,
  padding: 12,
  flex: 1,
} satisfies SxProps<Theme>;

export const dashboardContentMapHeaderTitleSx = {
  marginBottom: 0,
  flex: '1 1 auto',
  minWidth: 0,
} satisfies SxProps<Theme>;

export const dashboardContentMapBlockSwapButtonSx = {
  textTransform: 'none',
  fontWeight: 500,
  flexShrink: 0,
} satisfies SxProps<Theme>;

export const dashboardContentMapHeaderContainerSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
} satisfies SxProps<Theme>;

export const dashboardContentTitleSectionSx = {
  position: 'relative',
  display: 'flex',
  margin: '16px 0',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: GAP,
  flexWrap: 'wrap',
} satisfies SxProps<Theme>;

export const dashboardContentTitleSectionEditSx = {
  display: 'flex',
  padding: 16,
  margin: '16px 16px -48px 16px',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: GAP,
  flexWrap: 'wrap',
} satisfies SxProps<Theme>;

export const dashboardContentLogoSx = {
  flexShrink: 0,
  objectFit: 'contain',
} satisfies SxProps<Theme>;

export const dashboardContentTitleSx = {
  fontWeight: 'bold',
  fontSize: 24,
  margin: 0,
  flex: '1 1 auto',
  minWidth: 0,
} satisfies SxProps<Theme>;

export const dashboardContentTitleActionsSx = {
  display: 'flex',
  gap: '12px',
  flexShrink: 0,
} satisfies SxProps<Theme>;

export const dashboardContentLayoutSx = {
  display: 'flex',
  padding: 12,
  gap: 12,
  flex: 1,
  minHeight: 0,
  maxHeight: '100%',
  width: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const dashboardContentMapColumnSx = {
  flex: '2',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const dashboardContentSyncToggleSx = {
  margin: 0,
  '& .MuiFormControlLabel-label': {
    fontSize: '12px',
    fontWeight: 500,
  },
  '& .MuiSwitch-root': {
    marginRight: 4,
  },
} satisfies SxProps<Theme>;

export const dashboardContentTitleBarLabelSx = {
  display: 'flex',
  alignItems: 'center',
  marginRight: 16,
  fontWeight: 600,
  fontSize: 16,
  flex: 1,
} satisfies SxProps<Theme>;

export const dashboardContentTitleBarTypographySx = {
  flex: '1 0 fit-content',
  marginInlineEnd: 16,
} satisfies SxProps<Theme>;

export const dashboardContentTitleBarInputSx = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 4,
  fontSize: 16,
  border: 'none',
  outline: 'none',
  background: 'white',
  fontFamily: 'Roboto',
} satisfies SxProps<Theme>;
