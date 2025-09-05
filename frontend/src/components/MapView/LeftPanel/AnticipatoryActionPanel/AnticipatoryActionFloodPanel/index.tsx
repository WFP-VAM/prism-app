import { useState } from 'react';
import { useDispatch } from 'react-redux';
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
  Chip,
  TableSortLabel,
} from '@material-ui/core';
import { setAAFloodSelectedStation } from 'context/anticipatoryAction/AAFloodStateSlice';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { useSafeTranslation } from 'i18n';
import { AnticipatoryAction } from 'config/types';
import { useAnticipatoryAction } from '../useAnticipatoryAction';
import StationCharts from './StationCharts';
import { TABLE_WIDTH } from './constants';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      padding: '1rem',
    },
    title: {
      marginBottom: '1rem',
      fontWeight: 'bold',
    },
    tableContainer: {
      maxHeight: '70vh',
      overflow: 'auto',
    },
    table: {
      minWidth: TABLE_WIDTH,
    },
    riskChip: {
      color: 'white',
      fontWeight: 'bold',
      minWidth: '80px',
    },
    headerCell: {
      fontWeight: 'bold',
      backgroundColor: '#e0e0e0', // Gray header background
      color: '#333',
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
      backgroundColor: '#e3f2fd !important', // Light blue for selected row
    },
    tableCell: {
      color: '#000000', // Black text color
    },
  }),
);

type SortField = 'station_name' | 'date' | 'risk_level';
type SortDirection = 'asc' | 'desc';

function AnticipatoryActionFloodPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations, selectedStation, loading, error } = AAData;

  const [sortField, setSortField] = useState<SortField>('station_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  // eslint-disable-next-line fp/no-mutating-methods
  const sortedStations = [...stations].sort((a, b) => {
    const aValue: string | number = (() => {
      switch (sortField) {
        case 'station_name':
          return a.station_name;
        case 'date':
          return a.currentData?.time || '';
        case 'risk_level':
          return a.currentData?.risk_level || '';
        default:
          return '';
      }
    })();

    const bValue: string | number = (() => {
      switch (sortField) {
        case 'station_name':
          return b.station_name;
        case 'date':
          return b.currentData?.time || '';
        case 'risk_level':
          return b.currentData?.risk_level || '';
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

  if (loading) {
    return (
      <div className={classes.container}>
        <Typography>{t('Loading flood data...')}</Typography>
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
            {sortedStations.map(station => (
              <TableRow
                key={station.station_name}
                className={`${classes.row} ${
                  selectedStation === station.station_name
                    ? classes.selectedRow
                    : ''
                }`}
                onClick={() => handleRowClick(station.station_name)}
              >
                <TableCell className={classes.tableCell}>
                  {station.station_name || '-'}
                </TableCell>
                <TableCell className={classes.tableCell}>
                  {station.currentData
                    ? new Date(station.currentData.time).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell className={classes.tableCell}>
                  {station.currentData ? (
                    <Chip
                      label={station.currentData.risk_level}
                      className={classes.riskChip}
                      style={{
                        backgroundColor: getFloodRiskColor(
                          station.currentData.risk_level,
                        ),
                      }}
                    />
                  ) : (
                    <Chip
                      label="No data"
                      className={classes.riskChip}
                      style={{
                        backgroundColor: '#9e9e9e', // Gray for no data
                      }}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
        {t('Rows per page')} 20 | 1-{Math.min(20, stations.length)} /{' '}
        {stations.length}
      </div>

      {/* Show charts when a station is selected */}
      {selectedStation && (
        <StationCharts
          station={stations.find(s => s.station_name === selectedStation)!}
          onClose={() => dispatch(setAAFloodSelectedStation(''))}
        />
      )}
    </div>
  );
}

export default AnticipatoryActionFloodPanel;
