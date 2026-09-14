import type { SxProps, Theme } from '@mui/material/styles';

export const createDashboardRootSx = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 56px)',
  overflow: 'auto',
  background: '#F8F8F8',
} satisfies SxProps<Theme>;

export const createDashboardBackBarSx = {
  padding: '8px 16px',
  borderBottom: '1px solid #E0E0E0',
  background: 'white',
} satisfies SxProps<Theme>;

export const createDashboardBackButtonSx = {
  textTransform: 'none',
  color: 'text.secondary',
  '& .MuiButton-startIcon': {
    color: 'text.secondary',
  },
} satisfies SxProps<Theme>;

export const presetSelectorRootSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '48px 24px',
  maxWidth: 1200,
  margin: '0 auto',
} satisfies SxProps<Theme>;

export const presetSelectorHeadingSx = {
  fontWeight: 600,
  marginBottom: 8,
} satisfies SxProps<Theme>;

export const presetSelectorSubheadingSx = {
  color: 'text.secondary',
  marginBottom: 40,
  textAlign: 'center',
} satisfies SxProps<Theme>;

export const presetSelectorCardsSx = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 32,
} satisfies SxProps<Theme>;

export const presetCardSx = {
  width: 280,
  padding: 20,
  borderRadius: 8,
  border: '2px solid #E0E0E0',
  cursor: 'pointer',
  background: 'white',
  transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  '&:hover': {
    borderColor: 'primary.main',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  },
  '&:focus': {
    outline: 'none',
    borderColor: 'primary.main',
  },
} satisfies SxProps<Theme>;

export const presetCardSelectedSx = {
  borderColor: 'primary.main',
  boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  background: 'rgba(50, 54, 56, 0.04)',
} satisfies SxProps<Theme>;

export const presetContinueButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  minWidth: 200,
  padding: '10px 28px',
} satisfies SxProps<Theme>;

export const presetWireframeSx = {
  height: 120,
  marginBottom: 16,
  borderRadius: 4,
  overflow: 'hidden',
} satisfies SxProps<Theme>;

export const presetMapBlockSx = {
  flex: 2,
  background: '#B0BEC5',
  borderRadius: 4,
  height: '100%',
} satisfies SxProps<Theme>;

export const presetSidebarBlocksSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
} satisfies SxProps<Theme>;

export const presetSidebarBlockSx = {
  flex: 1,
  background: '#E0E0E0',
  borderRadius: 4,
} satisfies SxProps<Theme>;

export const presetCardLabelSx = {
  fontWeight: 600,
  fontSize: 15,
  marginBottom: 4,
} satisfies SxProps<Theme>;

export const presetCardDescriptionSx = {
  fontSize: 13,
  color: 'text.secondary',
  lineHeight: 1.4,
} satisfies SxProps<Theme>;

export const slotConfiguratorRootSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '40px 24px 48px',
  width: '100%',
  maxWidth: 1280,
  margin: '0 auto',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const slotConfiguratorHeadingSx = {
  fontWeight: 600,
  marginBottom: 8,
  textAlign: 'center',
  width: '100%',
} satisfies SxProps<Theme>;

export const slotConfiguratorSubheadingSx = {
  color: 'text.secondary',
  marginBottom: 24,
  textAlign: 'center',
  width: '100%',
  maxWidth: 640,
  lineHeight: 1.5,
} satisfies SxProps<Theme>;

export const slotConfiguratorPreviewSx = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  width: '100%',
  minHeight: 420,
  marginBottom: 24,
} satisfies SxProps<Theme>;

export const slotConfiguratorColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  borderRadius: 8,
  padding: 14,
  border: 1,
  borderStyle: 'dashed',
  borderColor: 'divider',
  background: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  minWidth: 0,
} satisfies SxProps<Theme>;

export const slotConfiguratorColumnHeaderSx = {
  flexShrink: 0,
} satisfies SxProps<Theme>;

export const slotConfiguratorColumnTitleSx = {
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  marginBottom: 4,
} satisfies SxProps<Theme>;

export const slotConfiguratorSidebarBodySx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minHeight: 0,
} satisfies SxProps<Theme>;

export const slotConfiguratorMapPlaceholderSx = {
  flex: 1,
  minHeight: 240,
  background: theme =>
    theme.palette.mode === 'dark' ? 'rgba(176, 190, 197, 0.35)' : '#CFD8DC',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 1,
  borderColor: 'divider',
} satisfies SxProps<Theme>;

export const slotConfiguratorMapLabelSx = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: 13,
} satisfies SxProps<Theme>;

export const slotCardSx = {
  background: 'background.default',
  border: 1,
  borderColor: 'divider',
  borderRadius: 6,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  boxSizing: 'border-box',
} satisfies SxProps<Theme>;

export const slotCardPromptSx = {
  fontSize: 12,
  color: 'text.secondary',
  marginBottom: 8,
  fontWeight: 500,
} satisfies SxProps<Theme>;

export const slotCardTypeButtonsSx = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  width: '100%',
} satisfies SxProps<Theme>;

export const slotCardTypeButtonSx = {
  textTransform: 'none',
  fontSize: 14,
  fontWeight: 500,
  flex: '1 1 108px',
  minHeight: 48,
  padding: '8px 14px',
  color: 'text.secondary',
  borderColor: 'grey.500',
  '& .MuiButton-startIcon': {
    marginRight: 8,
  },
  '&:hover': {
    color: 'text.secondary',
    borderColor: 'primary.main',
    backgroundColor: 'action.hover',
  },
} satisfies SxProps<Theme>;

export const slotCardTypeButtonIconSx = {
  fontSize: 22,
} satisfies SxProps<Theme>;

export const slotCardSetSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
  minHeight: 0,
} satisfies SxProps<Theme>;

export const slotCardTypeLabelSx = {
  fontWeight: 500,
  fontSize: 14,
} satisfies SxProps<Theme>;

export const slotConfiguratorAddButtonSx = {
  textTransform: 'none',
  alignSelf: 'stretch',
  borderStyle: 'dashed',
  borderWidth: 2,
  fontWeight: 500,
  padding: '8px 12px',
} satisfies SxProps<Theme>;

export const slotConfiguratorEmptyHintSx = {
  fontSize: 12,
  color: 'text.secondary',
  textAlign: 'left',
  lineHeight: 1.5,
  marginTop: 4,
  padding: '10px 12px',
  borderRadius: 6,
  background: theme =>
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.03)',
} satisfies SxProps<Theme>;

export const slotConfiguratorConfirmButtonSx = {
  textTransform: 'none',
  fontWeight: 500,
  padding: '8px 32px',
} satisfies SxProps<Theme>;
