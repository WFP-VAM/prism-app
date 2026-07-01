import type { SxProps, Theme } from '@mui/material/styles';
import {
  clearAllButtonSx,
  downloadButtonSx,
} from 'components/MapView/panelButtonStyles';
import { Panel, PanelSize } from 'config/types';
import { cyanBlue } from 'muiTheme';

export const leftPanelRootSx = (tabValue: Panel): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  overflowX: 'hidden',
  overflowY:
    tabValue === Panel.Charts || tabValue === Panel.Tables ? 'hidden' : 'auto',
});

export const tabsWrapperSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  order: -2,
};

export const analysisPanelRootSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  width: PanelSize.medium,
  height: '100%',
  overflow: 'hidden',
};

export const analysisPanelSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  width: PanelSize.medium,
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
};

export const exposureAnalysisLoadingContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2.5rem',
  height: '100%',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
};

export const exposureAnalysisLoadingTextContainerSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export const exposureAnalysisLoadingTextSx: SxProps<Theme> = {
  color: 'black',
};

export const analysisPanelParamsSx: SxProps<Theme> = {
  padding: '30px 10px 10px 10px',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
};

export const analysisTableContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 1rem',
};

export const analysisTableTitleSx: SxProps<Theme> = {
  fontSize: '16px',
  fontWeight: 400,
  color: 'black',
};

export const analysisTableCloseButtonSx = (theme: Theme): SxProps<Theme> => ({
  zIndex: theme.zIndex.modal,
  marginLeft: 'auto',
});

export const analysisButtonContainerSx = (theme: Theme): SxProps<Theme> => ({
  backgroundColor: theme.palette.primary.main,
  width: '100%',
});

const panelHalfWidthButtonLayoutSx: SxProps<Theme> = {
  marginTop: '10px',
  marginBottom: '10px',
  marginLeft: '25%',
  marginRight: '25%',
  width: '50%',
};

export const analysisButtonSx: SxProps<Theme> = {
  ...clearAllButtonSx,
  ...panelHalfWidthButtonLayoutSx,
};

export const bottomButtonSx: SxProps<Theme> = {
  '&&': {
    backgroundColor: cyanBlue,
    color: 'white',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: cyanBlue,
    },
    '&.Mui-disabled': {
      opacity: 0.5,
      backgroundColor: '#788489',
      color: 'white',
      '&:hover': {
        backgroundColor: '#788489',
      },
    },
  },
  ...panelHalfWidthButtonLayoutSx,
};

export const alertFormMenuSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  width: PanelSize.medium,
  height: '100%',
  overflow: 'scroll',
  backgroundColor: 'white',
  color: 'black',
};

export const newAlertFormContainerSx: SxProps<Theme> = {
  padding: '30px 10px 10px 10px',
  height: 'calc(100% - 90px)',
  overflow: 'auto',
};

export const thresholdInputsContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'row',
  gap: '16px',
  marginTop: '10px',
};

export const numberFieldSx: SxProps<Theme> = {
  paddingRight: '10px',
  maxWidth: '140px',
  '& label': {
    color: '#333333',
  },
};

export const regionSelectorSx: SxProps<Theme> = {
  width: '100%',
};

export const createAlertButtonSx = (theme: Theme): SxProps<Theme> => ({
  '&&': {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: 'black',
    },
    '&.Mui-disabled': {
      opacity: 0.5,
      backgroundColor: theme.palette.primary.main,
      color: 'white',
    },
  },
  marginTop: '10px',
  marginBottom: '10px',
  marginLeft: '25%',
  marginRight: '25%',
  width: '50%',
});

export const tablesPanelRootSx: SxProps<Theme> = {
  position: 'relative',
  display: 'flex',
  width: PanelSize.medium,
  height: '100%',
};

export const tablesPanelLinearProgressSx: SxProps<Theme> = {
  width: '100%',
  position: 'absolute',
  top: 0,
};

export const tablesPanelSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 40,
  width: PanelSize.medium,
};

export const tablesActionsContainerSx = (theme: Theme): SxProps<Theme> => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'absolute',
  backgroundColor: theme.palette.primary.main,
  width: '100%',
  bottom: 0,
  paddingTop: 10,
  paddingBottom: 10,
});

export const tablesSelectRootSx: SxProps<Theme> = {
  width: '90%',
  '& .MuiInputBase-root': {
    '&:hover fieldset': {
      borderColor: '#333333',
    },
  },
  '& .MuiInputBase-input': {
    color: '#333333',
  },
  '& .MuiInputBase-root.Mui-focused fieldset': {
    borderColor: '#333333',
  },
  '& .MuiInputLabel-root': {
    color: '#333333',
  },
};

export const tablesActionsButtonsContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '50%',
  gap: '10px',
};

export const showHideTableButtonSx: SxProps<Theme> = {
  ...clearAllButtonSx,
  width: '100%',
};

export const tablesDownloadCsvButtonSx: SxProps<Theme> = {
  ...downloadButtonSx,
  width: '100%',
};

export const tableHeadSx = {
  backgroundColor: '#EBEBEB',
  boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
} satisfies SxProps<Theme>;

export const tableHeadCompactSx = {
  '&&': {
    backgroundColor: theme => `${theme.palette.divider} !important`,
    boxShadow: 'none !important',
    padding: '4px 8px !important',
    border: 'none !important',
    borderBottom: theme => `1px solid ${theme.palette.divider} !important`,
    '&:first-of-type': {
      paddingLeft: '16px !important',
    },
    '&:last-of-type': {
      paddingRight: '16px !important',
    },
  },
} satisfies SxProps<Theme>;

export const tableHeaderTextSx = {
  color: 'black',
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.875rem',
} satisfies SxProps<Theme>;

export const tableHeaderTextCompactSx = {
  fontWeight: '600 !important',
  fontSize: '14px !important',
} satisfies SxProps<Theme>;

export const tableBodyCellCompactSx = {
  '&&': {
    padding: '4px !important',
    border: 'none !important',
    '&:first-of-type': {
      paddingLeft: '16px !important',
    },
    '&:last-of-type': {
      paddingRight: '16px !important',
    },
  },
} satisfies SxProps<Theme>;

export const tableBodyTextSx = {
  color: 'black',
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.875rem',
} satisfies SxProps<Theme>;

export const tableBodyTextCompactSx = {
  fontSize: '14px !important',
} satisfies SxProps<Theme>;

export const tableContainerSx = (theme: Theme): SxProps<Theme> => ({
  marginTop: '10px',
  zIndex: theme.zIndex.modal + 1,
});

export const tableContainerCompactSx = {
  marginTop: 0,
  backgroundColor: 'white',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: 'none',
  border: theme => `1px solid ${theme.palette.divider}`,
} satisfies SxProps<Theme>;

export const tableContainerLowZIndexSx = {
  zIndex: 'auto !important',
} satisfies SxProps<Theme>;

export const tablePaginationSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'black',
  flexShrink: 0,
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.875rem',
  '& .MuiTablePagination-select': {
    flex: '1 1 10%',
    marginRight: 0,
  },
  '& .MuiTablePagination-displayedRows': {
    flex: '1 2 30%',
    marginLeft: 0,
    textTransform: 'none',
    letterSpacing: 'normal',
    fontSize: '0.875rem',
  },
  '& .MuiTablePagination-spacer': {
    flex: '1 1 5%',
    maxWidth: '5%',
  },
};

export const exposureTablePaginationSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'black',
  overflow: 'unset',
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.875rem',
  '& .MuiTablePagination-select': {
    flex: '1 1 10%',
    marginRight: 0,
  },
  '& .MuiTablePagination-displayedRows': {
    flex: '1 2 40%',
    marginLeft: 0,
    textTransform: 'none',
    letterSpacing: 'normal',
    fontSize: '0.875rem',
  },
  '& .MuiTablePagination-spacer': {
    flex: '1 1 5%',
    maxWidth: '5%',
  },
};

export const tablePaginationBackButtonSx: SxProps<Theme> = {
  flex: '1 1 5%',
};

export const tablePaginationNextButtonSx: SxProps<Theme> = {
  flex: '1 1 5%',
};

export const exposureTablePaginationBackButtonSx: SxProps<Theme> = {
  flex: '1 1 5%',
  maxWidth: '10%',
};

export const exposureTablePaginationNextButtonSx: SxProps<Theme> = {
  flex: '1 1 5%',
  maxWidth: '10%',
};

export const exposureTableBodySx: SxProps<Theme> = {
  padding: '8px',
};

export const dataTableRootSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  padding: '10px 5px 5px',
  width: '100%',
  overflowX: 'hidden',
};

export const dataTableTitleContainerSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  justifyContent: 'center',
  alignItems: 'center',
};

export const dataTableTitleTextSx: SxProps<Theme> = {
  fontSize: '2rem',
};

export const dataTableLegendTextSx: SxProps<Theme> = {
  fontSize: '9px',
};

export const dataTableChartContainerSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  minHeight: '371px',
};

export const dataTableLoadingContainerSx: SxProps<Theme> = {
  height: '100%',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  gap: '10px',
};

export const dataTableTextLoadingContainerSx: SxProps<Theme> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export const dataTablePaginationSx: SxProps<Theme> = {
  alignSelf: 'flex-end',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'black',
  flexShrink: 0,
  textTransform: 'none',
  letterSpacing: 'normal',
  fontSize: '0.875rem',
};
