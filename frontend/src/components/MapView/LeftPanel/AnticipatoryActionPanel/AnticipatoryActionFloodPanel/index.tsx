import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { RootState } from 'context/store';
import {
  loadAAFloodData,
  setAAFloodSelectedStation,
  setAAFloodView,
} from 'context/anticipatoryAction/AAFloodStateSlice';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { FloodStation, AAFloodView } from 'context/anticipatoryAction/AAFloodStateSlice/types';
import { useSafeTranslation } from 'i18n';

const useStyles = makeStyles(() =>
  createStyles({
    tabPanel: {
      padding: '1rem',
    },
    stationCard: {
      marginBottom: '1rem',
    },
    riskChip: {
      color: 'white',
      fontWeight: 'bold',
    },
    tableContainer: {
      marginTop: '1rem',
    },
  }),
);

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  const classes = useStyles();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`flood-tabpanel-${index}`}
      aria-labelledby={`flood-tab-${index}`}
      {...other}
    >
      {value === index && <div className={classes.tabPanel}>{children}</div>}
    </div>
  );
}

function AnticipatoryActionFloodPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const { stations, selectedStation, view, loading, error } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    dispatch(loadAAFloodData());
  }, [dispatch]);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
    switch (newValue) {
      case 0:
        dispatch(setAAFloodView(AAFloodView.Home));
        break;
      case 1:
        dispatch(setAAFloodView(AAFloodView.Station));
        break;
      case 2:
        dispatch(setAAFloodView(AAFloodView.Forecast));
        break;
      case 3:
        dispatch(setAAFloodView(AAFloodView.Historical));
        break;
      default:
        break;
    }
  };

  const handleStationSelect = (stationName: string) => {
    dispatch(setAAFloodSelectedStation(stationName));
  };

  if (loading) {
    return (
      <div className={classes.tabPanel}>
        <Typography>{t('Loading flood data...')}</Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.tabPanel}>
        <Typography color="error">
          {t('Error loading flood data: {{error}}', { error })}
        </Typography>
      </div>
    );
  }

  return (
    <div>
      <Tabs value={tabValue} onChange={handleTabChange}>
        <Tab label={t('Overview')} />
        <Tab label={t('Stations')} />
        <Tab label={t('Forecast')} />
        <Tab label={t('Historical')} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>
          {t('Flood Monitoring Overview')}
        </Typography>
        <Grid container spacing={2}>
          {stations.map(station => (
            <Grid item xs={12} sm={6} md={4} key={station.station_name}>
              <Card className={classes.stationCard}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {station.station_name}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {station.river_name}
                  </Typography>
                  {station.currentData && (
                    <Chip
                      label={station.currentData.risk_level}
                      className={classes.riskChip}
                      style={{
                        backgroundColor: getFloodRiskColor(
                          station.currentData.risk_level,
                        ),
                      }}
                    />
                  )}
                  <div style={{ marginTop: '0.5rem' }}>
                    <Button
                      size="small"
                      onClick={() => handleStationSelect(station.station_name)}
                    >
                      {t('View Details')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          {t('Station Details')}
        </Typography>
        {selectedStation ? (
          <StationDetailsView stationName={selectedStation} />
        ) : (
          <Typography>{t('Select a station to view details')}</Typography>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          {t('Forecast Data')}
        </Typography>
        {selectedStation ? (
          <ForecastView stationName={selectedStation} />
        ) : (
          <Typography>{t('Select a station to view forecast')}</Typography>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          {t('Historical Data')}
        </Typography>
        {selectedStation ? (
          <HistoricalView stationName={selectedStation} />
        ) : (
          <Typography>
            {t('Select a station to view historical data')}
          </Typography>
        )}
      </TabPanel>
    </div>
  );
}

// Placeholder components for the different views
function StationDetailsView({ stationName }: { stationName: string }) {
  const { t } = useSafeTranslation();
  const { stations } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  const station = stations.find(s => s.station_name === stationName);

  if (!station) {
    return <Typography>{t('Station not found')}</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{station.station_name}</Typography>
        <Typography color="textSecondary">{station.river_name}</Typography>
        <Typography variant="body2">
          {t('Location ID: {{id}}', { id: station.location_id })}
        </Typography>
        {station.currentData && (
          <div style={{ marginTop: '1rem' }}>
            <Typography variant="subtitle1">{t('Current Status')}</Typography>
            <Typography>
              {t('Risk Level: {{level}}', { level: station.currentData.risk_level })}
            </Typography>
            <Typography>
              {t('Average Discharge: {{value}}', {
                value: station.currentData.avg_discharge.toFixed(2),
              })}
            </Typography>
            <Typography>
              {t('Max Discharge: {{value}}', {
                value: station.currentData.max_discharge.toFixed(2),
              })}
            </Typography>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastView({ stationName }: { stationName: string }) {
  const { t } = useSafeTranslation();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          {t('Forecast for {{station}}', { station: stationName })}
        </Typography>
        <Typography>{t('Forecast data will be displayed here')}</Typography>
      </CardContent>
    </Card>
  );
}

function HistoricalView({ stationName }: { stationName: string }) {
  const { t } = useSafeTranslation();
  const { stations } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  const station = stations.find(s => s.station_name === stationName);

  if (!station) {
    return <Typography>{t('Station not found')}</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">
          {t('Historical Data for {{station}}', { station: stationName })}
        </Typography>
        <TableContainer component={Paper} className={useStyles().tableContainer}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('Date')}</TableCell>
                <TableCell>{t('Risk Level')}</TableCell>
                <TableCell>{t('Avg Discharge')}</TableCell>
                <TableCell>{t('Max Discharge')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {station.historicalData.slice(-10).map((data, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(data.time).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={data.risk_level}
                      size="small"
                      className={useStyles().riskChip}
                      style={{
                        backgroundColor: getFloodRiskColor(data.risk_level),
                      }}
                    />
                  </TableCell>
                  <TableCell>{data.avg_discharge.toFixed(2)}</TableCell>
                  <TableCell>{data.max_discharge.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

export default AnticipatoryActionFloodPanel;
