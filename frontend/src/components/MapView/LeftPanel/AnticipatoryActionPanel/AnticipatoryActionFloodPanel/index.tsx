import { useState, useMemo } from 'react';
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
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations, selectedStation, loading, error, stationSummaryData } =
    AAData;
  const { startDate } = useSelector(dateRangeSelector);

  const [sortField, setSortField] = useState<SortField>('risk_level');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rowsPerPage, setRowsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (stationName: string) => {
    dispatch(setAAFloodSelectedStation(stationName));
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalStations / rowsPerPage) - 1;
    setCurrentPage(prev => Math.min(maxPage, prev + 1));
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
    const startIndex = currentPage * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedStations.slice(startIndex, endIndex);
  }, [sortedStations, currentPage, rowsPerPage]);

  const totalStations = sortedStations.length;
  const startIndex = currentPage * rowsPerPage + 1;
  const endIndex = Math.min((currentPage + 1) * rowsPerPage, totalStations);
  const totalPages = Math.ceil(totalStations / rowsPerPage);

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

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
          onClose={() => dispatch(setAAFloodSelectedStation(''))}
        />
      )}
    </div>
  );
}

export default AnticipatoryActionFloodPanel;
