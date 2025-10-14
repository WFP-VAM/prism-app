import {
  Box,
  makeStyles,
  Typography,
  Button,
  Switch,
  FormControlLabel,
} from '@material-ui/core';
import { ArrowForward, Edit, VisibilityOutlined } from '@material-ui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { useSafeTranslation } from 'i18n';
import { black, cyanBlue } from 'muiTheme';
import {
  DashboardTextConfig,
  DashboardChartConfig,
  DashboardMode,
} from 'config/types';

import MapBlock from './MapBlock';
import {
  dashboardConfigSelector,
  setTitle,
  dashboardSyncEnabledSelector,
  toggleMapSync,
  dashboardModeSelector,
  setMode,
} from '../../context/dashboardStateSlice';
import { clearAnalysisResult } from '../../context/analysisResultStateSlice';
import TextBlock from './TextBlock';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';

function DashboardView() {
  const classes = useStyles();
  const dashboardConfig = useSelector(dashboardConfigSelector);
  const {
    title: dashboardTitle,
    flexElements: dashboardFlexElements,
    maps: dashboardMaps,
    isEditable,
  } = dashboardConfig;
  const syncEnabled = useSelector(dashboardSyncEnabledSelector);
  const mode = useSelector(dashboardModeSelector);
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();

  const isTwoMapLayout = dashboardMaps.length === 2;

  const getFlexElementsForMap = (mapIndex: number) => {
    if (!isTwoMapLayout) {
      return [];
    }
    return dashboardFlexElements.filter((_, index) => index % 2 === mapIndex);
  };

  // Clear any existing analysis state when component mounts
  useEffect(() => {
    dispatch(clearAnalysisResult());
  }, [dispatch, dashboardTitle]);

  // Clear analysis state when component unmounts (navigating away from dashboard)
  useEffect(
    () => () => {
      dispatch(clearAnalysisResult());
    },
    [dispatch],
  );

  const handlePreviewClick = () => {
    dispatch(setMode(DashboardMode.PREVIEW));
  };

  const handleClosePreview = () => {
    dispatch(setMode(DashboardMode.EDIT));
  };

  return (
    <Box
      className={
        mode === DashboardMode.PREVIEW
          ? classes.previewModeContainer
          : classes.container
      }
    >
      {mode === DashboardMode.PREVIEW && (
        <Box className={classes.previewActions}>
          {isEditable && (
            <Button
              color="primary"
              variant="outlined"
              disableElevation
              startIcon={<Edit />}
              onClick={handleClosePreview}
              size="medium"
            >
              {t('Edit')}
            </Button>
          )}
          <Button
            color="primary"
            variant="contained"
            disableElevation
            endIcon={<ArrowForward />}
            size="medium"
            style={{ backgroundColor: cyanBlue, color: black }}
          >
            {t('Print')}
          </Button>
        </Box>
      )}

      {(mode === 'preview' || mode === 'edit') && (
        <Box className={classes.titleSection}>
          {mode === 'preview' ? (
            <Typography
              variant="h2"
              component="h1"
              className={classes.previewTitle}
            >
              {dashboardTitle || t('Untitled Dashboard')}
            </Typography>
          ) : (
            <Box className={classes.titleCard}>
              <label className={classes.titleBarLabel}>
                <Typography
                  variant="h2"
                  component="span"
                  className={classes.titleBarTypography}
                >
                  {t('Dashboard title')}
                </Typography>
                <input
                  type="text"
                  className={classes.titleBarInput}
                  placeholder={t('Enter dashboard title')}
                  value={dashboardTitle}
                  onChange={e => dispatch(setTitle(e.target.value))}
                  name="dashboard-title"
                />
              </label>
              {isTwoMapLayout && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={syncEnabled}
                      onChange={() => dispatch(toggleMapSync())}
                      color="primary"
                      size="medium"
                    />
                  }
                  label={t('Sync maps')}
                  className={classes.syncToggle}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {isTwoMapLayout ? (
        <Box
          className={
            mode === 'preview'
              ? classes.twoMapPreviewLayout
              : classes.twoMapLayout
          }
        >
          {dashboardMaps.map((_, mapIndex) => (
            <Box
              // eslint-disable-next-line react/no-array-index-key
              key={`map-column-${mapIndex}`}
              className={classes.mapColumn}
            >
              <Box
                className={
                  mode === DashboardMode.PREVIEW
                    ? classes.previewContainer
                    : classes.grayCard
                }
              >
                {mode === 'edit' && (
                  <div className={classes.mapHeaderContainer}>
                    <Typography
                      variant="h3"
                      component="h3"
                      className={classes.blockLabel}
                    >
                      {dashboardMaps.length > 1
                        ? `Map ${mapIndex + 1}`
                        : 'Map block'}{' '}
                      — {t('Choose map layers')}
                    </Typography>
                  </div>
                )}
                <div style={{ height: '700px' }}>
                  <MapBlock mapIndex={mapIndex} mode={mode} />
                </div>
              </Box>

              {getFlexElementsForMap(mapIndex).length > 0 && (
                <Box className={classes.mapColumnFlexElements}>
                  {getFlexElementsForMap(mapIndex).map(
                    (element, _elementIndex) => {
                      const originalIndex = dashboardFlexElements.findIndex(
                        el => el === element,
                      );
                      if (element.type === 'TEXT') {
                        const content =
                          (element as DashboardTextConfig)?.content || '';
                        return (
                          <TextBlock
                            // eslint-disable-next-line react/no-array-index-key
                            key={`text-block-${originalIndex}`}
                            content={content}
                            index={originalIndex}
                            mode={mode}
                          />
                        );
                      }
                      if (element.type === 'TABLE') {
                        return (
                          <TableBlock
                            // eslint-disable-next-line react/no-array-index-key
                            key={`table-block-${originalIndex}`}
                            index={originalIndex}
                            startDate={element.startDate}
                            hazardLayerId={element.hazardLayerId}
                            baselineLayerId={element.baselineLayerId}
                            threshold={element.threshold}
                            stat={element.stat}
                            mode={mode}
                          />
                        );
                      }
                      if (element.type === 'CHART') {
                        const chartElement = element as DashboardChartConfig;
                        return (
                          <ChartBlock
                            // eslint-disable-next-line react/no-array-index-key
                            key={`chart-block-${originalIndex}`}
                            index={originalIndex}
                            startDate={chartElement.startDate}
                            endDate={chartElement.endDate}
                            wmsLayerId={chartElement.wmsLayerId}
                            adminUnitLevel={chartElement.adminUnitLevel}
                            adminUnitId={chartElement.adminUnitId}
                            mode={mode}
                          />
                        );
                      }
                      return null;
                    },
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          className={
            mode === 'preview' ? classes.previewLayout : classes.layout
          }
        >
          <Box className={classes.leadingContentArea}>
            <div className={classes.mapsContainer}>
              {dashboardMaps.map((_, mapIndex) => (
                <Box
                  // eslint-disable-next-line react/no-array-index-key
                  key={`map-${mapIndex}`}
                  className={
                    mode === 'preview'
                      ? classes.previewContainer
                      : classes.grayCard
                  }
                >
                  {mode === 'edit' && (
                    <div className={classes.mapHeaderContainer}>
                      <Typography
                        variant="h3"
                        component="h3"
                        className={classes.blockLabel}
                      >
                        {dashboardMaps.length > 1
                          ? `Map ${mapIndex + 1}`
                          : 'Map block'}{' '}
                        — {t('Choose map layers')}
                      </Typography>
                      {dashboardMaps.length === 2 && mapIndex === 0 && (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={syncEnabled}
                              onChange={() => dispatch(toggleMapSync())}
                              color="primary"
                              size="small"
                            />
                          }
                          label={t('Sync maps')}
                          className={classes.syncToggle}
                        />
                      )}
                    </div>
                  )}
                  <div style={{ height: '700px', width: '100%' }}>
                    <MapBlock mapIndex={mapIndex} mode={mode} />
                  </div>
                </Box>
              ))}
            </div>
          </Box>

          {dashboardFlexElements.length > 0 && (
            <Box className={classes.trailingContentArea}>
              {dashboardFlexElements?.map((element, index) => {
                if (element.type === 'TEXT') {
                  const content =
                    (element as DashboardTextConfig)?.content || '';
                  return (
                    <TextBlock
                      // eslint-disable-next-line react/no-array-index-key
                      key={`text-block-${index}`}
                      content={content}
                      index={index}
                      mode={mode}
                    />
                  );
                }
                if (element.type === 'TABLE') {
                  return (
                    <TableBlock
                      // eslint-disable-next-line react/no-array-index-key
                      key={`table-block-${index}`}
                      index={index}
                      startDate={element.startDate}
                      hazardLayerId={element.hazardLayerId}
                      baselineLayerId={element.baselineLayerId}
                      threshold={element.threshold}
                      stat={element.stat}
                      mode={mode}
                    />
                  );
                }
                return <div>{t('Content type not yet supported')}</div>;
              })}
            </Box>
          )}
        </Box>
      )}

      {mode === 'edit' && (
        <Box className={classes.toolbar}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<VisibilityOutlined />}
            onClick={handlePreviewClick}
            className={classes.previewButton}
            size="medium"
          >
            {t('Back to Dashboard')}
          </Button>
        </Box>
      )}
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  blockLabel: {
    fontWeight: 600,
    fontSize: 16,
    marginBottom: 12,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
  },
  layout: {
    display: 'flex',
    padding: 16,
    margin: '0 16px 16px 16px',
    gap: 16,
    flex: 1,
    overflow: 'auto',
    paddingBottom: 80, // Add extra padding to account for fixed toolbar
  },
  leadingContentArea: {
    flex: '2',
  },
  trailingContentArea: {
    flex: '1',
  },
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  titleCard: {
    display: 'flex',
    background: '#F1F1F1',
    borderRadius: 8,
    marginBottom: 0, // No bottom margin for title card
    padding: 12,
  },
  titleBarLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
    flex: 1,
  },
  titleBarTypography: {
    flex: '1 0 fit-content',
    marginInlineEnd: 16,
  },
  titleBarInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
  },
  toolbar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1400,
  },
  previewButton: {
    textTransform: 'none',
    fontWeight: 500,
  },
  previewDialog: {
    '& .MuiDialog-paper': {
      margin: '48px 0 0 0',
      height: '100vh',
      background: '#F8F8F8',
    },
    '& .MuiDialog-paperFullWidth ': {
      maxWidth: 'calc(100% - 16px)',
      width: '100%',
    },
  },
  dialogContent: {
    padding: 0,
  },
  mapsContainer: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    '& > .MuiBox-root': {
      flex: 1,
      minWidth: 0, // Prevents flex items from overflowing
    },
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: 'calc(100% - 32px)',
    height: '700px',
  },
  previewTitle: {
    padding: 16,
    fontWeight: 500,
    fontSize: 20,
    margin: 0,
  },
  previewModeContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
    background: '#F8F8F8',
  },
  previewActions: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderBottom: '1px solid #E0E0E0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    zIndex: 1300,
  },
  titleSection: {
    padding: '0 16px',
    margin: '16px 16px 0 16px',
  },
  previewLayout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
    flex: 1,
    overflow: 'auto',
  },
  twoMapLayout: {
    display: 'flex',
    padding: 16,
    margin: '0 16px 16px 16px',
    gap: 16,
    flex: 1,
    overflow: 'auto',
  },
  twoMapPreviewLayout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
    flex: 1,
    overflow: 'auto',
  },
  mapColumn: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    minWidth: 0,
  },
  mapColumnFlexElements: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  mapHeaderContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncToggle: {
    margin: 0,
    '& .MuiFormControlLabel-label': {
      fontSize: '12px',
      fontWeight: 500,
    },
    '& .MuiSwitch-root': {
      marginRight: 4,
    },
  },
}));

export default DashboardView;
