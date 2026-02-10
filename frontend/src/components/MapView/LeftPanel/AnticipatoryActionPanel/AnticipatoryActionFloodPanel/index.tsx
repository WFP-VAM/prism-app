import { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  createStyles,
  makeStyles,
  TableSortLabel,
  Box,
  IconButton,
} from '@material-ui/core';
import { cyanBlue } from 'muiTheme';
import { ChevronLeft, ChevronRight } from '@material-ui/icons';
import { setAAFloodSelectedStation } from 'context/anticipatoryAction/AAFloodStateSlice';
import {
  getFloodRiskColor,
  getFloodRiskSeverity,
} from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { useSafeTranslation } from 'i18n';
import { AnticipatoryAction } from 'config/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import SimpleDropdown from 'components/Common/SimpleDropdown';
import { useUrlHistory } from 'utils/url-utils';
import { useAnticipatoryAction } from '../useAnticipatoryAction';
import StationCharts from './StationCharts';
import { TABLE_WIDTH } from './constants';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      padding: '1rem',
      height: 'calc(100% - 40px)',
    },
    title: {
      marginBottom: '1rem',
      fontWeight: 'bold',
    },
    tableContainer: {
      maxHeight: '68vh',
      overflow: 'auto',
    },
    table: {
      minWidth: TABLE_WIDTH,
    },
    headerCell: {
      backgroundColor: '#f1f1f1', // Gray header background
      color: '#000',
      '& .MuiTableSortLabel-root.MuiTableSortLabel-active': {
        color: '#333 !important',
      },
    },
    row: {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#f5f5f5',
      },
      '&:nth-of-type(even)': {
        backgroundColor: '#f9f9f9', // Very light gray for even rows
      },
      '&:nth-of-type(odd)': {
        backgroundColor: '#ffffff', // White for odd rows
      },
    },
    selectedRow: {
      backgroundColor: `${cyanBlue} !important`,
      '& $firstCell': {
        color: '#000000', // Black text for first cell when selected
      },
    },
    tableCell: {
      color: '#000000', // Black text color
    },
    firstCell: {
      color: `${cyanBlue}`,
      fontWeight: 'bold',
    },
    pagination: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '1rem',
      color: '#666',
      position: 'absolute',
      width: '90%',
      bottom: '10px',
    },
    rowsPerPageContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    pageNavigation: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
  }),
);

type SortField = 'station_name' | 'date' | 'risk_level';
type SortDirection = 'asc' | 'desc';

const rowsPerPageOptions: [number, string][] = [
  [10, '10'],
  [20, '20'],
  [50, '50'],
  [100, '100'],
];

function AnticipatoryActionFloodPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { urlParams, updateHistory, removeKeyFromUrl } = useUrlHistory();
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations, selectedStation, loading, error, stationSummaryData } =
    AAData;
  const { startDate } = useSelector(dateRangeSelector);

  // Initialize state from URL params or defaults with validation
  const [sortField, setSortField] = useState<SortField>(() => {
    const urlSort = urlParams.get('aaFloodSort');
    const validSortFields: SortField[] = ['station_name', 'date', 'risk_level'];
    return validSortFields.includes(urlSort as SortField)
      ? (urlSort as SortField)
      : 'risk_level';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    const urlDir = urlParams.get('aaFloodSortDir');
    return urlDir === 'asc' || urlDir === 'desc' ? urlDir : 'desc';
  });
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const urlRows = parseInt(urlParams.get('aaFloodRows') || '20', 10);
    const validRowOptions = [10, 20, 50, 100];
    return validRowOptions.includes(urlRows) ? urlRows : 20;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const urlPage = parseInt(urlParams.get('aaFloodPage') || '0', 10);
    return !Number.isNaN(urlPage) && urlPage >= 0 ? urlPage : 0;
  });

  // Sync selected station from URL to Redux on mount
  useEffect(() => {
    const stationFromUrl = urlParams.get('aaFloodStation');
    if (stationFromUrl && stationFromUrl !== selectedStation) {
      dispatch(setAAFloodSelectedStation(stationFromUrl));
    }
    // This effect should only run on mount to avoid infinite loops
  }, []);

  // Sync selected station from Redux to URL whenever it changes
  useEffect(() => {
    if (selectedStation) {
      updateHistory('aaFloodStation', selectedStation);
    } else {
      // Remove param if no station selected
      removeKeyFromUrl('aaFloodStation');
    }
  }, [selectedStation, updateHistory, removeKeyFromUrl]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      updateHistory('aaFloodSortDir', newDirection);
    } else {
      setSortField(field);
      setSortDirection('asc');
      updateHistory('aaFloodSort', field);
      updateHistory('aaFloodSortDir', 'asc');
    }
  };

  const handleRowClick = (stationName: string) => {
    dispatch(setAAFloodSelectedStation(stationName));
    // URL will be updated by the useEffect that watches selectedStation
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
    updateHistory('aaFloodRows', String(newRowsPerPage));
    updateHistory('aaFloodPage', '0');
  };

  const handlePreviousPage = () => {
    const newPage = Math.max(0, currentPage - 1);
    setCurrentPage(newPage);
    updateHistory('aaFloodPage', String(newPage));
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalStations / rowsPerPage) - 1;
    const newPage = Math.min(maxPage, currentPage + 1);
    setCurrentPage(newPage);
    updateHistory('aaFloodPage', String(newPage));
  };

  const formatDateForDisplay = (value: string | number | Date) => {
    const d = new Date(value);
    // Normalize to 12:00 UTC to avoid local timezone shifting the calendar date
    d.setUTCHours(12, 0, 0, 0);
    // format as dd-mm-yyyy
    return getFormattedDate(d, DateFormat.DayFirstHyphen);
  };

  // Filter stations by selected date
  const filteredStations = useMemo(() => {
    if (!startDate) {
      return stations;
    }
    const selectedDateKey = new Date(startDate).toISOString().split('T')[0];
    return stations.filter((station: { station_name: string }) => {
      const avg = stationSummaryData?.[station.station_name];
      const issueDate = avg?.forecast_issue_date
        ? new Date(avg.forecast_issue_date).toISOString().split('T')[0]
        : null;
      return issueDate === selectedDateKey;
    });
  }, [stations, startDate, stationSummaryData]);

  // Get station data for selected date
  const getStationDataForDate = (station: any) => {
    const avg = stationSummaryData?.[station.station_name];
    if (!avg) {
      return null;
    }
    return {
      time: avg.forecast_issue_date,
      risk_level: avg.trigger_status || 'Not exceeded',
    } as any;
  };

  const sortedStations = [...filteredStations].sort((a, b) => {
    const aData = getStationDataForDate(a);
    const bData = getStationDataForDate(b);

    const aValue: string | number = (() => {
      switch (sortField) {
        case 'station_name':
          return a.station_name;
        case 'date':
          return aData?.time || '';
        case 'risk_level':
          return getFloodRiskSeverity(aData?.risk_level);
        default:
          return '';
      }
    })();

    const bValue: string | number = (() => {
      switch (sortField) {
        case 'station_name':
          return b.station_name;
        case 'date':
          return bData?.time || '';
        case 'risk_level':
          return getFloodRiskSeverity(bData?.risk_level);
        default:
          return '';
      }
    })();

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const paginatedStations = useMemo(() => {
    // Clamp currentPage to valid range to handle invalid URL parameters
    const maxPage = Math.max(
      0,
      Math.ceil(sortedStations.length / rowsPerPage) - 1,
    );
    const validPage = Math.min(Math.max(0, currentPage), maxPage);
    const startIndex = validPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedStations.slice(startIndex, endIndex);
  }, [sortedStations, currentPage, rowsPerPage]);

  const totalStations = sortedStations.length;
  // Clamp currentPage for display calculations
  const maxPage = Math.max(0, Math.ceil(totalStations / rowsPerPage) - 1);
  const validCurrentPage = Math.min(Math.max(0, currentPage), maxPage);
  const startIndex = validCurrentPage * rowsPerPage + 1;
  const endIndex = Math.min(
    (validCurrentPage + 1) * rowsPerPage,
    totalStations,
  );
  const totalPages = Math.ceil(totalStations / rowsPerPage);

  const canGoPrevious = validCurrentPage > 0;
  const canGoNext = validCurrentPage < totalPages - 1;

  if (loading) {
    return (
      <div className={classes.container}>
        <Typography>{t('Loading flood data...')}</Typography>
        <TableContainer component={Paper} className={classes.tableContainer}>
          <Table className={classes.table} size="small">
            <TableBody />
          </Table>
        </TableContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.container}>
        <Typography color="error">
          {t('Error loading flood data: {{error}}', { error })}
        </Typography>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <Typography variant="h6" className={classes.title}>
        {t('River gauge status overview')}
      </Typography>
      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table className={classes.table} size="small">
          <TableHead>
            <TableRow>
              <TableCell className={classes.headerCell}>
                <TableSortLabel
                  active={sortField === 'station_name'}
                  direction={
                    sortField === 'station_name' ? sortDirection : 'asc'
                  }
                  onClick={() => handleSort('station_name')}
                >
                  {t('Gauge station')}
                </TableSortLabel>
              </TableCell>
              <TableCell className={classes.headerCell}>
                <TableSortLabel
                  active={sortField === 'date'}
                  direction={sortField === 'date' ? sortDirection : 'asc'}
                  onClick={() => handleSort('date')}
                >
                  {t('Date')}
                </TableSortLabel>
              </TableCell>
              <TableCell className={classes.headerCell}>
                <TableSortLabel
                  active={sortField === 'risk_level'}
                  direction={sortField === 'risk_level' ? sortDirection : 'asc'}
                  onClick={() => handleSort('risk_level')}
                >
                  {t('Status')}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedStations.map(station => {
              const stationData = getStationDataForDate(station);
              return (
                <TableRow
                  key={station.station_name}
                  className={`${classes.row} ${
                    selectedStation === station.station_name
                      ? classes.selectedRow
                      : ''
                  }`}
                  onClick={() => handleRowClick(station.station_name)}
                >
                  <TableCell className={classes.firstCell}>
                    {station.station_name || '-'}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {stationData ? formatDateForDisplay(stationData.time) : '-'}
                  </TableCell>
                  <TableCell className={classes.tableCell}>
                    {stationData ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <Typography>{t(stationData.risk_level)}</Typography>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: getFloodRiskColor(
                              stationData.risk_level,
                            ),
                          }}
                        />
                      </div>
                    ) : (
                      <Typography>{t('No data')}</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box className={classes.pagination}>
        <Box className={classes.rowsPerPageContainer}>
          <Typography>{t('Rows per page')}:</Typography>
          <SimpleDropdown
            options={rowsPerPageOptions}
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            textClass=""
          />
        </Box>
        <Box className={classes.pageNavigation}>
          <IconButton
            onClick={handlePreviousPage}
            disabled={!canGoPrevious}
            size="small"
          >
            <ChevronLeft />
          </IconButton>
          <Typography>
            {totalStations > 0 ? `${startIndex}-${endIndex}` : '0-0'} {t('of')}{' '}
            {totalStations}
          </Typography>
          <IconButton
            onClick={handleNextPage}
            disabled={!canGoNext}
            size="small"
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* Show charts when a station is selected */}
      {selectedStation && (
        <StationCharts
          station={
            stations.find(
              (s: { station_name: string }) =>
                s.station_name === selectedStation,
            )!
          }
          onClose={() => {
            dispatch(setAAFloodSelectedStation(''));
            // URL will be updated by the useEffect that watches selectedStation
          }}
        />
      )}
    </div>
  );
}

export default AnticipatoryActionFloodPanel;
