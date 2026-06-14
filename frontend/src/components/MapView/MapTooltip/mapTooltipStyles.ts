import type { SxProps, Theme } from '@mui/material/styles';

export const MAP_TOOLTIP_POPUP_CLASS = 'prism-map-tooltip-popup';
export const MAP_TOOLTIP_POPUP_EXPANDED_CLASS =
  'prism-map-tooltip-popup-expanded';

const mapTooltipPopupContentSx = {
  '& > .maplibregl-popup-content': {
    background: 'black',
    color: 'white',
    padding: '5px 5px 5px 5px',
    maxHeight: '400px',
    overflow: 'auto',
    '& .MuiTypography-root': {
      color: 'white',
    },
  },
  '& > .maplibregl-popup-tip': {
    borderTopColor: 'black',
    borderBottomColor: 'black',
  },
} satisfies SxProps<Theme>;

/** Overrides react-map-gl default maxWidth 240px — point-data chart popup */
export const mapTooltipPopupSx = {
  maxWidth: '40em !important',
  zIndex: 5,
  ...mapTooltipPopupContentSx,
} satisfies SxProps<Theme>;

/** Main tooltip popup — no max width cap for chart admin drill-down */
export const mapTooltipPopupExpandedSx = {
  maxWidth: 'none',
  zIndex: 5,
  ...mapTooltipPopupContentSx,
} satisfies SxProps<Theme>;

export const mapTooltipCloseButtonSx = {
  color: 'white',
  position: 'absolute',
  right: 0,
  top: 0,
} satisfies SxProps<Theme>;

export const mapTooltipTitleSx = {
  fontWeight: 600,
  marginBottom: '8px',
  color: 'white',
} satisfies SxProps<Theme>;

export const mapTooltipTextSx = {
  marginBottom: '4px',
  color: 'white',
} satisfies SxProps<Theme>;

export const phasePopulationTableSx = {
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  width: '100%',
  borderWidth: '1px;',
  borderColor: 'inherit',
  borderStyle: 'solid',
  border: '1px solid white',
} satisfies SxProps<Theme>;

export const phasePopulationTableRowSx = {
  border: '1px solid white',
} satisfies SxProps<Theme>;

export const externalLinkContainerSx = {
  display: 'flex',
  gap: '8px',
  color: '#5b9bd5',
  fontWeight: 'bold',
  marginBottom: '8px',
  alignItems: 'center',
} satisfies SxProps<Theme>;

export const chartsContainerSx = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
} satisfies SxProps<Theme>;

export const chartsSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
} satisfies SxProps<Theme>;

export const selectChartContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'start',
} satisfies SxProps<Theme>;

export const selectLevelButtonSx = {
  '&&': {
    textTransform: 'none',
  },
} satisfies SxProps<Theme>;

export const selectLevelButtonValueSx = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'start',
} satisfies SxProps<Theme>;

export const selectLevelButtonTextSx = {
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  maxWidth: '280px',
} satisfies SxProps<Theme>;

export const chartContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
} satisfies SxProps<Theme>;

export const chartSectionSx = {
  height: '240px',
  width: '400px',
  flexGrow: 1,
} satisfies SxProps<Theme>;

export const pointDataChartContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  paddingTop: '8px',
} satisfies SxProps<Theme>;

export const pointDataChartSectionSx = {
  paddingTop: '16px',
  height: '200px',
  width: '400px',
} satisfies SxProps<Theme>;

/** GlobalStyles map for maplibre Popup classNames */
export const mapTooltipPopupGlobalStyles = {
  [`.${MAP_TOOLTIP_POPUP_CLASS}`]: mapTooltipPopupSx,
  [`.${MAP_TOOLTIP_POPUP_EXPANDED_CLASS}`]: mapTooltipPopupExpandedSx,
} satisfies Record<string, SxProps<Theme>>;
