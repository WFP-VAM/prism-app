import type { SxProps, Theme } from '@mui/material/styles';
import { TIMELINE_ITEM_WIDTH } from 'components/MapView/DateSelector/utils';
import { AAStormColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
import { grey } from 'muiTheme';

import {
  DARK_BLUE_HEX,
  DARK_GREEN_HEX,
  DARK_ORANGE_HEX,
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
  LIGHT_ORANGE_HEX,
} from './utils';

export const TIMELINE_DAY_ITEM_CLASS = 'prism-timeline-day-item';

export const dateItemFullSx = {
  color: '#101010',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  borderLeft: '1px solid #101010',
  height: 36,
} satisfies SxProps<Theme>;

export const dateItemSx = {
  color: '#101010',
  position: 'relative',
  top: -5,
  cursor: 'pointer',
  minWidth: TIMELINE_ITEM_WIDTH,
  // Set a transparent border to prevent layout shifts when the border color changes on hover.
  // Do not remove this unless you are sure layout shifts will not occur.
  borderLeft: '1px solid transparent',
  '&:hover': {
    borderLeft: '1px solid #101010',
    [`& .${TIMELINE_DAY_ITEM_CLASS}`]: {
      borderLeft: 0,
    },
  },
} satisfies SxProps<Theme>;

export const defaultTooltipSx = {
  '&&': {
    bgcolor: '#222222',
    opacity: '0.85 !important',
    maxWidth: 'none',
  },
} satisfies SxProps<Theme>;

export const aaStormTooltipSx = {
  '&&': {
    bgcolor: '#FFFFFF',
    border: '1px solid #D3D3D3',
    maxWidth: 'none',
  },
} satisfies SxProps<Theme>;

export const aaStormTooltipArrowSx = {
  '&&': {
    width: '11px',
    height: '11px',
    bottom: '-1px !important',
    '&::before': {
      width: '8px',
      height: '8px',
      backgroundColor: 'white',
      transformOrigin: 'center !important',
      boxSizing: 'border-box',
      borderWidth: '0px 1px 1px 0px',
      borderColor: '#D3D3D3',
      borderStyle: 'solid',
    },
  },
} satisfies SxProps<Theme>;

const createLayerSx = (
  backgroundColor: string,
  top: number,
): SxProps<Theme> => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity: 0.6,
  top,
  bgcolor: backgroundColor,
});

const createTimelineItemSx = (
  backgroundColor: string,
  top: number,
  opacity = 0.8,
): SxProps<Theme> => ({
  position: 'absolute',
  height: 10,
  width: TIMELINE_ITEM_WIDTH,
  pointerEvents: 'none',
  opacity,
  top,
  bgcolor: backgroundColor,
});

export const availabilityDateSx = createLayerSx(grey, 0);

export const layerOneCoverageTickSx = createTimelineItemSx(
  LIGHT_BLUE_HEX,
  0,
  0.6,
);
export const layerTwoCoverageTickSx = createTimelineItemSx(
  LIGHT_GREEN_HEX,
  10,
  0.6,
);
export const layerThreeCoverageTickSx = createTimelineItemSx(
  LIGHT_ORANGE_HEX,
  20,
  0.6,
);

export const layerOneValidityTickSx = createTimelineItemSx(LIGHT_BLUE_HEX, 0);
export const layerTwoValidityTickSx = createTimelineItemSx(LIGHT_GREEN_HEX, 10);
export const layerThreeValidityTickSx = createTimelineItemSx(
  LIGHT_ORANGE_HEX,
  20,
);

export const layerOneQueryTickSx = createTimelineItemSx(DARK_BLUE_HEX, 0, 1);
export const layerTwoQueryTickSx = createTimelineItemSx(DARK_GREEN_HEX, 10, 1);
export const layerThreeQueryTickSx = createTimelineItemSx(
  DARK_ORANGE_HEX,
  20,
  1,
);

export const DATE_ITEM_STYLING = [
  {
    color: LIGHT_BLUE_HEX,
    coverageTick: layerOneCoverageTickSx,
    validityTick: layerOneValidityTickSx,
    queryTick: layerOneQueryTickSx,
  },
  {
    color: LIGHT_GREEN_HEX,
    coverageTick: layerTwoCoverageTickSx,
    validityTick: layerTwoValidityTickSx,
    queryTick: layerTwoQueryTickSx,
  },
  {
    color: LIGHT_ORANGE_HEX,
    coverageTick: layerThreeCoverageTickSx,
    validityTick: layerThreeValidityTickSx,
    queryTick: layerThreeQueryTickSx,
  },
] as const;

export const dateItemLabelSx = {
  color: '#101010',
  position: 'absolute',
  top: 33,
  textAlign: 'left',
  pl: '2px',
  minWidth: 400,
  fontWeight: 'bold',
  zIndex: 1,
} satisfies SxProps<Theme>;

export const dayItemSx = {
  position: 'absolute',
  height: 10,
  marginLeft: '-1px',
  borderLeft: '1px solid #ededed',
  zIndex: -1,
} satisfies SxProps<Theme>;

export const tooltipItemContainerSx = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
} satisfies SxProps<Theme>;

export const tooltipItemColorSx = {
  display: 'flex',
  width: 10,
  height: 10,
  mr: '3px',
} satisfies SxProps<Theme>;

const aaStormTimelineItemBaseSx = {
  position: 'absolute',
  pointerEvents: 'none',
  width: TIMELINE_ITEM_WIDTH - 1,
  top: 0,
} satisfies SxProps<Theme>;

export const aaStormEmptySpaceSx = {
  ...aaStormTimelineItemBaseSx,
  height: 10,
} satisfies SxProps<Theme>;

export const aaStormLowRiskIndicatorSx = {
  ...aaStormTimelineItemBaseSx,
  height: 12,
  bgcolor: '#b5ecf4',
} satisfies SxProps<Theme>;

export const aaStormReadyIndicatorSx = {
  ...aaStormTimelineItemBaseSx,
  height: 16,
  bgcolor: '#63B2BD',
} satisfies SxProps<Theme>;

export const aaStormActivated1IndicatorSx = {
  ...aaStormTimelineItemBaseSx,
  height: 20,
  bgcolor: AAStormColors.categories.moderate.background,
} satisfies SxProps<Theme>;

export const aaStormActivated2IndicatorSx = {
  ...aaStormTimelineItemBaseSx,
  height: 24,
  bgcolor: AAStormColors.categories.severe.background,
} satisfies SxProps<Theme>;

export const aaStormTooltipContainerSx = {
  display: 'flex',
  flexDirection: 'column',
} satisfies SxProps<Theme>;

export const aaStormTooltipDateAndCyclonesContainerSx = {
  display: 'flex',
  alignItems: 'center',
} satisfies SxProps<Theme>;

export const aaStormTooltipDateSx = {
  minWidth: 'fit-content',
  gap: '8px',
} satisfies SxProps<Theme>;

export const aaStormTooltipCyclonesContainerSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
} satisfies SxProps<Theme>;

export const aaStormTooltipCycloneRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  justifyContent: 'flex-end',
  width: '100%',
} satisfies SxProps<Theme>;

export const aaStormTooltipCycloneNameSx = {
  fontSize: '12px',
  fontWeight: 500,
  minWidth: 'fit-content',
} satisfies SxProps<Theme>;

export const aaStormTooltipTimeSx = {
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '15px',
  color: '#101010',
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

export const aaStormTooltipToggleButtonSx = {
  '&&': {
    p: '6px 6px',
    minHeight: 0,
  },
} satisfies SxProps<Theme>;
