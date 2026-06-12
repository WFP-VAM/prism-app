import type { SxProps, Theme } from '@mui/material/styles';
import { PanelSize } from 'config/types';
import { black, borderGray, cyanBlue, grey, lightGrey } from 'muiTheme';

import {
  CHART_WIDTH,
  TABLE_WIDTH,
} from './AnticipatoryActionFloodPanel/constants';
import { AAStormColors } from './AnticipatoryActionStormPanel/utils';

/** WebKit scrollbar styling shared by scrollable AA panels */
export const aaScrollbarSx = {
  '&::-webkit-scrollbar': {
    width: '0.5rem',
    height: '0.5rem',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '0.25rem',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#555',
  },
  '&::-webkit-scrollbar-track': {
    borderRadius: '0.25rem',
  },
} satisfies SxProps<Theme>;

/** AA phase/category icon (used across drought tables, timeline, district view) */
export const aaIconSx = {
  iconWrapper: {
    height: '100%',
    borderRadius: '2px 0 0 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Roboto',
  } satisfies SxProps<Theme>,
  centerContainer: {
    width: '2.1em',
    borderRadius: '2px',
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  topTextContainer: {
    textAlign: 'center',
    fontSize: '14px',
    lineHeight: '17px',
    fontWeight: 700,
  } satisfies SxProps<Theme>,
  bottomTextContainer: {
    textAlign: 'center',
    fontSize: '10px',
    lineHeight: '17px',
    fontWeight: 700,
  } satisfies SxProps<Theme>,
};

/** Footer, window header, tags — shared across drought/storm panels */
export const aaCommonSx = {
  footerWrapper: {
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  footerActionsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '0.5rem',
    gap: '1rem',
  } satisfies SxProps<Theme>,
  footerDialogsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '0.5rem',
    paddingTop: 0,
  } satisfies SxProps<Theme>,
  footerButton: {
    '&&': {
      borderColor: cyanBlue,
      color: black,
    },
  } satisfies SxProps<Theme>,
  footerDialog: {
    textDecoration: 'underline',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'right',
  } satisfies SxProps<Theme>,
  footerWrapperVert: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  } satisfies SxProps<Theme>,
  footerDialogsWrapperVert: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '0.5rem',
  } satisfies SxProps<Theme>,
  newTag: {
    height: '2em',
    padding: '0 0.5em',
    color: 'white',
    background: '#A4A4A4',
    fontSize: '10px',
    borderRadius: '32px',
    display: 'flex',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  windowHeader: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  } satisfies SxProps<Theme>,
};

export const aaStyledSelectSx: SxProps<Theme> = {
  '&&': {
    '&:focus': {
      backgroundColor: 'transparent',
    },
  },
};

/** AALegend wrapper paper */
export const aaLegendPaperSx = {
  padding: '8px',
  width: 180,
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
} satisfies SxProps<Theme>;

/** AADroughtLegend */
export const aaDroughtLegendSx = {
  itemWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: '0.5rem',
  } satisfies SxProps<Theme>,
  dialogButton: {
    fontWeight: 'bold',
    textDecoration: 'underline',
    cursor: 'pointer',
  } satisfies SxProps<Theme>,
};

/** AAStormLegend */
export const aaStormLegendSx = {
  root: {
    padding: '0rem 0rem',
  } satisfies SxProps<Theme>,
  title: {
    fontWeight: 'bold',
    marginBottom: '1rem',
  } satisfies SxProps<Theme>,
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '1rem',
    marginBottom: '1rem',
  } satisfies SxProps<Theme>,
  itemWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } satisfies SxProps<Theme>,
  icon: {
    width: '20px',
    height: '20px',
    objectFit: 'contain',
  } satisfies SxProps<Theme>,
  colorBox: {
    width: '20px',
    height: '20px',
    border: '3px solid',
    borderRadius: '3px',
  } satisfies SxProps<Theme>,
  line: {
    width: '20px',
    height: 0,
  } satisfies SxProps<Theme>,
  districtBox: {
    width: '30px',
    height: '20px',
    border: '1px solid #666',
    borderRadius: '2px',
  } satisfies SxProps<Theme>,
};

/** AAFloodLegend */
export const aaFloodLegendSx = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  } satisfies SxProps<Theme>,
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  } satisfies SxProps<Theme>,
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    fontSize: '0.95rem',
  } satisfies SxProps<Theme>,
  itemWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  } satisfies SxProps<Theme>,
  categoryCircle: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  } satisfies SxProps<Theme>,
  itemText: {
    fontSize: '0.9rem',
  } satisfies SxProps<Theme>,
  divider: {
    margin: '0.75rem 0',
  } satisfies SxProps<Theme>,
  description: {
    fontSize: '0.85rem',
    color: '#666',
    lineHeight: 1.4,
  } satisfies SxProps<Theme>,
  link: {
    textDecoration: 'underline',
    color: '#1976d2',
    cursor: 'pointer',
  } satisfies SxProps<Theme>,
};

/** HowToReadModal + ActionsModal shared dialog styles */
export const aaDialogSx = {
  titleWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  } satisfies SxProps<Theme>,
  dialogButton: {
    '&&': {
      borderColor: cyanBlue,
      color: black,
    },
  } satisfies SxProps<Theme>,
};

export const howToReadModalSx = {
  ...aaDialogSx,
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  } satisfies SxProps<Theme>,
  contentItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } satisfies SxProps<Theme>,
  dialogActionsWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
  } satisfies SxProps<Theme>,
};

export const actionsModalSx = {
  ...aaDialogSx,
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } satisfies SxProps<Theme>,
  actionRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: '1rem',
    color: 'black',
  } satisfies SxProps<Theme>,
  actionIconWrapper: {
    width: '2rem',
  } satisfies SxProps<Theme>,
  dialogActionsWrapper: {
    display: 'flex',
    justifyContent: 'center',
  } satisfies SxProps<Theme>,
};

/** AnticipatoryActionDroughtPanel shell */
export const aaDroughtPanelSx = {
  anticipatoryActionPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    height: '100%',
    justifyContent: 'space-between',
  } satisfies SxProps<Theme>,
  headerWrapper: {
    padding: '1rem 1rem 0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.50rem',
  } satisfies SxProps<Theme>,
  radioButtonGroup: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  } satisfies SxProps<Theme>,
  titleSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  } satisfies SxProps<Theme>,
};

export const aaDroughtRadioSx = {
  radio: {
    '&&': {
      padding: '0.25rem',
      '&.Mui-checked': {
        color: black,
      },
    },
  } satisfies SxProps<Theme>,
  radioLabel: {
    border: `1px solid ${borderGray}`,
    borderRadius: '32px',
    height: '1.75rem',
    marginLeft: 0,
    marginRight: '0.5rem',
  } satisfies SxProps<Theme>,
  checkbox: {
    '&&': {
      padding: '0.2rem',
      '&.Mui-checked': {
        color: black,
      },
    },
  } satisfies SxProps<Theme>,
  checkboxLabel: {
    border: `1px solid ${borderGray}`,
    borderRadius: '2px',
    height: '1.75rem',
    marginLeft: 0,
  } satisfies SxProps<Theme>,
};

/** HomeTable */
export const aaHomeTableSx = {
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: PanelSize.medium,
    background: lightGrey,
    padding: '0.5rem 0',
    overflowY: 'scroll',
    borderBottom: `1px solid ${grey}`,
    ...aaScrollbarSx,
  } satisfies SxProps<Theme>,
  areaTagWrapper: {
    border: `1px solid ${borderGray}`,
    height: 'calc(2rem - 2px)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25em',
    padding: '0 0.25em',
    background: 'none',
    boxShadow: 'none',
    '&:hover': {
      cursor: 'pointer',
    },
  } satisfies SxProps<Theme>,
  rowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '0.125rem 0.5rem',
    paddingRight: 0,
  } satisfies SxProps<Theme>,
  iconCol: {
    width: '3rem',
    minHeight: '4rem',
  } satisfies SxProps<Theme>,
  windowBackground: {
    background: 'white',
    height: '100%',
    width: '100%',
  } satisfies SxProps<Theme>,
  tagWrapper: {
    padding: '0.5rem 0.5rem',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: '0.5em',
  } satisfies SxProps<Theme>,
  emptyText: {
    color: borderGray,
  } satisfies SxProps<Theme>,
};

/** Timeline */
export const aaTimelineSx = {
  root: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    background: lightGrey,
    overflow: 'auto',
    justifyContent: 'space-around',
    overflowY: 'scroll',
    ...aaScrollbarSx,
  } satisfies SxProps<Theme>,
  windowWrapper: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5rem 0.25rem',
    color: 'black',
  } satisfies SxProps<Theme>,
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  } satisfies SxProps<Theme>,
  headRowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '2.5rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  rowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '5.3rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  iconColumn: {
    width: '3rem',
    padding: '0.1rem 0.25rem',
  } satisfies SxProps<Theme>,
  headColumn: {
    width: '4rem',
    padding: '0.1rem 0.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  column: {
    width: '4rem',
    padding: '0.1rem 0.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  monthText: {
    background: lightGrey,
    borderRadius: '4px',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: '2rem',
    width: '100%',
  } satisfies SxProps<Theme>,
};

export const aaTimelineItemSx = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '2px',
    boxSizing: 'border-box',
    padding: '0.25rem',
  } satisfies SxProps<Theme>,
  probabilityBar: {
    height: '0.3rem',
    marginBottom: '0.25rem',
    borderRadius: '0 2px 2px 0',
  } satisfies SxProps<Theme>,
  triggerBar: {
    height: '0.25rem',
    backgroundColor: 'black',
    borderRadius: '0 2px 2px 0',
  } satisfies SxProps<Theme>,
  indexText: {
    whiteSpace: 'nowrap',
    lineHeight: '1.2rem',
  } satisfies SxProps<Theme>,
};

/** Forecast */
export const aaForecastSx = {
  noData: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  } satisfies SxProps<Theme>,
  charts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    width: '100%',
    background: lightGrey,
  } satisfies SxProps<Theme>,
  chartsHeader: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingLeft: '2.6rem',
    paddingRight: '0.5rem',
    marginBottom: '-1rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  chartLine: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    background: 'white',
  } satisfies SxProps<Theme>,
  textWrap: {
    width: '2.6rem',
    display: 'flex',
    justifyContent: 'center',
  } satisfies SxProps<Theme>,
  text: {
    fontSize: '0.9rem',
    fontWeight: 400,
    borderRadius: '2px',
    writingMode: 'vertical-lr',
    textTransform: 'uppercase',
    transform: 'rotate(180deg)',
    padding: '0.5rem 0.1rem',
    margin: 'auto',
  } satisfies SxProps<Theme>,
  chartWrapper: {
    paddingBottom: '0.5rem',
    height: '7rem',
    width: '100%',
  } satisfies SxProps<Theme>,
  label: {
    background: lightGrey,
    margin: '0.5rem',
    borderRadius: '4px',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: '2rem',
    width: '100%',
  } satisfies SxProps<Theme>,
};

/** DistrictView */
export const aaDistrictViewSx = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    background: lightGrey,
    overflow: 'scroll',
  } satisfies SxProps<Theme>,
  districtViewWrapper: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    background: lightGrey,
    overflow: 'scroll',
    justifyContent: 'space-around',
  } satisfies SxProps<Theme>,
  windowWrapper: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0rem 0.25rem',
  } satisfies SxProps<Theme>,
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  } satisfies SxProps<Theme>,
  rowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '3rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  headRowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    minHeight: '2.5rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  headColumn: {
    width: '4.6rem',
    padding: '0.1rem 0.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  column: {
    width: '4.6rem',
    height: '3.2rem',
    padding: '0.1rem 0.25rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  headerText: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies SxProps<Theme>,
  monthText: {
    background: lightGrey,
    borderRadius: '4px',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: '2rem',
    width: '100%',
  } satisfies SxProps<Theme>,
  iconWrapper: {
    width: '100%',
    height: '100%',
  } satisfies SxProps<Theme>,
  actionsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0.5rem 0',
  } satisfies SxProps<Theme>,
  actionBoxesWrapper: {
    display: 'flex',
    flexDirection: 'row',
  } satisfies SxProps<Theme>,
  actionBox: {
    height: '6.2rem',
    width: '4.6rem',
    margin: '0.1rem 0.25rem',
    background: 'white',
    borderRadius: '4px',
    color: 'black',
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    paddingTop: '0.8rem',
    paddingBottom: '0.8rem',
    border: 'none',
  } satisfies SxProps<Theme>,
  noDataText: {
    margin: 'auto',
  } satisfies SxProps<Theme>,
};

/** Storm panel */
export const aaStormPanelSx = {
  anticipatoryActionPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } satisfies SxProps<Theme>,
  headerWrapper: {
    padding: '1rem 1rem 0 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  } satisfies SxProps<Theme>,
  titleSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  } satisfies SxProps<Theme>,
  select: {
    border: '1px solid #000',
    borderRadius: '4px',
    padding: '0rem 0.5rem',
  } satisfies SxProps<Theme>,
  selectText: {
    fontSize: '18px',
    fontWeight: 600,
    lineHeight: '18px',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
  } satisfies SxProps<Theme>,
};

export const aaStormTriggerSx = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  } satisfies SxProps<Theme>,
  wrapper: {
    width: '100%',
    background: AAStormColors.background,
  } satisfies SxProps<Theme>,
  headColumnWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '2.5rem',
    margin: '1.5rem 1.5rem',
  } satisfies SxProps<Theme>,
  headColumn: {
    width: '10rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies SxProps<Theme>,
  headColumnText: {
    borderRadius: '4px 4px 0px 0px',
    textAlign: 'left',
    textTransform: 'uppercase',
    lineHeight: '2rem',
    width: '100%',
    paddingLeft: '0.5rem',
    background: '#63b2bd',
    color: 'black',
  } satisfies SxProps<Theme>,
  headerText: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    height: '2rem',
    display: 'flex',
    margin: '0.2rem 1.5rem',
  } satisfies SxProps<Theme>,
  rowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '0.125rem 0.5rem',
    paddingRight: 0,
    background: 'white',
  } satisfies SxProps<Theme>,
};

export const aaActivationTriggerSx = {
  ...aaStormTriggerSx,
  rowWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: '0.5rem',
    gap: '0.5rem',
    background: 'white',
  } satisfies SxProps<Theme>,
  tagWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  } satisfies SxProps<Theme>,
  categoryText: {
    borderRadius: '4px 4px 0px 0px',
    textAlign: 'left',
    textTransform: 'uppercase',
    lineHeight: '2rem',
    width: '100%',
    paddingLeft: '0.5rem',
  } satisfies SxProps<Theme>,
  areaTagWrapper: {
    border: '1px solid',
    height: 'calc(2rem - 2px)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25em',
    padding: '0 0.25em',
    background: 'none',
    boxShadow: 'none',
    '&:hover': {
      cursor: 'pointer',
    },
  } satisfies SxProps<Theme>,
};

/** Flood panel */
export const aaFloodPanelSx = {
  container: {
    padding: '1rem',
    height: 'calc(100% - 40px)',
  } satisfies SxProps<Theme>,
  title: {
    marginBottom: '1rem',
    fontWeight: 'bold',
  } satisfies SxProps<Theme>,
  tableContainer: {
    maxHeight: '68vh',
    overflow: 'auto',
  } satisfies SxProps<Theme>,
  table: {
    minWidth: TABLE_WIDTH,
  } satisfies SxProps<Theme>,
  headerCell: {
    backgroundColor: '#f1f1f1',
    color: '#000',
    '&& .MuiTableSortLabel-root.MuiTableSortLabel-active': {
      color: '#333 !important',
    },
  } satisfies SxProps<Theme>,
  row: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
    '&:nth-of-type(even)': {
      backgroundColor: '#f9f9f9',
    },
    '&:nth-of-type(odd)': {
      backgroundColor: '#ffffff',
    },
  } satisfies SxProps<Theme>,
  selectedRow: {
    backgroundColor: `${cyanBlue} !important`,
    '& td:first-of-type': {
      color: '#000000',
    },
  } satisfies SxProps<Theme>,
  tableCell: {
    color: '#000000',
  } satisfies SxProps<Theme>,
  firstCell: {
    color: cyanBlue,
    fontWeight: 'bold',
  } satisfies SxProps<Theme>,
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '1rem',
    color: '#666',
    position: 'absolute',
    width: '90%',
    bottom: '10px',
  } satisfies SxProps<Theme>,
  rowsPerPageContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } satisfies SxProps<Theme>,
  pageNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  } satisfies SxProps<Theme>,
};

export const aaStationChartsSx = {
  container: {
    position: 'fixed',
    top: '56px',
    left: TABLE_WIDTH + 16,
    width: CHART_WIDTH,
    marginLeft: '2rem',
    maxHeight: '70vh',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  } satisfies SxProps<Theme>,
  paper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1rem 0 1rem',
  } satisfies SxProps<Theme>,
  title: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingBottom: '0.5rem',
  } satisfies SxProps<Theme>,
  closeButton: {
    marginTop: '-1rem',
  } satisfies SxProps<Theme>,
  tabs: {
    minHeight: '34px',
    borderBottom: '1px solid #D4D4D4',
    display: 'flex',
    gap: '4px',
    margin: '0 1rem',
  } satisfies SxProps<Theme>,
  tab: {
    border: '1px solid #D4D4D4',
    borderBottom: 'none',
    borderRadius: '4px 4px 0 0',
    fontSize: '12px',
    color: '#000',
    textTransform: 'none',
    background: '#F1F1F1',
    minWidth: '150px',
  } satisfies SxProps<Theme>,
  selectedTab: {
    background: '#FFF',
    fontWeight: 'bold',
  } satisfies SxProps<Theme>,
  tabPanel: {
    flex: 1,
    margin: '0 1rem',
    border: '1px solid #D4D4D4',
    borderTop: 'none',
    padding: '0.5rem',
    overflow: 'auto',
  } satisfies SxProps<Theme>,
  chartContainer: {
    height: '400px',
    position: 'relative',
  } satisfies SxProps<Theme>,
  noDataMessage: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: '2rem',
  } satisfies SxProps<Theme>,
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-start',
  } satisfies SxProps<Theme>,
  actionButton: {
    textTransform: 'none',
    fontSize: '0.9rem',
    color: '#333',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
  } satisfies SxProps<Theme>,
  tableContainer: {
    height: '400px',
    overflow: 'auto',
    color: '#000',
  } satisfies SxProps<Theme>,
  tableCell: {
    fontSize: '0.8rem',
    padding: '8px',
    color: '#000000',
  } satisfies SxProps<Theme>,
  tableHeader: {
    fontWeight: 'bold',
    fontSize: '0.8rem',
    minWidth: '40px',
    backgroundColor: '#f5f5f5',
  } satisfies SxProps<Theme>,
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
    flexDirection: 'column',
    gap: '1rem',
  } satisfies SxProps<Theme>,
};
