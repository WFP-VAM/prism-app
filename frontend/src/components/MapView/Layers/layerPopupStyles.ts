import type { SxProps, Theme } from '@mui/material/styles';

const whitePopupContentSx = {
  border: 'none',
  padding: '4px',
  borderRadius: '4px',
  background: 'white',
  boxShadow: 'inset 0px 0px 0px 1px #A4A4A4',
  position: 'relative',
} as const;

export const STORM_DATE_POPUP_CLASS = 'prism-storm-date-popup';
export const LANDFALL_MARKER_POPUP_CLASS = 'prism-landfall-marker-popup';
export const LANDFALL_INFO_POPUP_CLASS = 'prism-landfall-info-popup';

export const stormDatePopupSx = {
  '& > .maplibregl-popup-content': whitePopupContentSx,
  '& > .maplibregl-popup-tip': {
    display: 'none',
  },
  // hack to display the popup tip without overlapping border
  '&::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    top: -5,
    width: '10px',
    height: '10px',
    background: 'white',
    transform: 'translateX(-50%) rotate(45deg)',
    boxShadow: 'inset 1px 1px 0px 0px #A4A4A4',
  },
} satisfies SxProps<Theme>;

export const landfallMarkerPopupSx = {
  '& > .maplibregl-popup-content': whitePopupContentSx,
  '& > .maplibregl-popup-tip': {
    display: 'none',
  },
  // hack to display the popup tip without overlapping border
  '&::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    bottom: '-5px',
    width: '10px',
    height: '10px',
    background: 'white',
    transform: 'translateX(-50%) rotate(45deg)',
    borderWidth: '0px 1px 1px 0px',
    borderColor: '#A4A4A4',
    borderStyle: 'solid',
  },
} satisfies SxProps<Theme>;

export const horizontalLandfallPopupOffset = 25;

export const landfallInfoPopupSx = {
  width: '280px',
  '& > .maplibregl-popup-content': {
    background: '#F1F1F1',
    padding: '0px 2px 0px 2px',
    border: 'none',
    borderRadius: '4px',
    boxShadow: 'inset 0px 1px 0px 0px #A4A4A4',
    position: 'relative',
  },
  '& > .maplibregl-popup-tip': {
    display: 'none',
  },
  // hack to display the popup tip without overlapping border
  '&::after': {
    background: '#F1F1F1',
    content: '""',
    position: 'absolute',
    left: `${horizontalLandfallPopupOffset * 2}px`,
    top: -5,
    width: '10px',
    height: '10px',
    transform: 'translateX(-50%) rotate(45deg)',
    boxShadow: 'inset 1px 1px 0px 0px #A4A4A4',
  },
} satisfies SxProps<Theme>;

/** GlobalStyles map for maplibre Popup classNames */
export const layerPopupGlobalStyles = {
  [`.${STORM_DATE_POPUP_CLASS}`]: stormDatePopupSx,
  [`.${LANDFALL_MARKER_POPUP_CLASS}`]: landfallMarkerPopupSx,
  [`.${LANDFALL_INFO_POPUP_CLASS}`]: landfallInfoPopupSx,
} satisfies Record<string, SxProps<Theme>>;

export const stormDateTooltipTextSx = {
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '14px',
} satisfies SxProps<Theme>;

export const landfallMarkerTooltipTextSx = {
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '14px',
  paddingBottom: '2px',
} satisfies SxProps<Theme>;
