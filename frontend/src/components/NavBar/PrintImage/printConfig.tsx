import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  createStyles,
  Divider,
  FormControl,
  Icon,
  IconButton,
  InputLabel,
  makeStyles,
  Menu,
  MenuItem,
  Select,
  TextField,
  Theme,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { Cancel, GetApp } from '@material-ui/icons';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import Switch from 'components/Common/Switch';
import { AspectRatio } from 'components/MapExport/types';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { LayerKey } from 'config/types';
import { cyanBlue } from 'muiTheme';
import React, { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MAP_EXPORT_MAX_URLS_PER_REQUEST,
  PRISM_SIGN_IN_URL,
} from 'utils/constants';

import { useSafeTranslation } from '../../../i18n';
import AspectRatioSelector from './AspectRatioSelector';
import BatchMapExportJobRows from './batchMapExport/BatchMapExportJobRows';
import {
  useBatchMapExportJobsActions,
  useBatchMapExportJobsState,
} from './batchMapExport/useBatchMapExportJobs';
import CadenceSelector from './CadenceSelector';
import DateRangePicker from './DateRangePicker';
import PrintConfigContext from './printConfig.context';
import {
  isPrintPanelPrimaryDisabled,
  isSchedulePrimaryDisabled,
  schedulePrimaryButtonLabelKey,
} from './scheduleExportUi';
import {
  fetchScheduleWhoamiSession,
  type ScheduleWhoamiSessionStatus,
} from './scheduleWhoamiSession';

interface ToggleSelectorProps {
  title: string;
  value: number | string;
  options: {
    value: number | string;
    comp: React.JSX.Element;
    disabled?: boolean;
  }[];
  iconProp?: number;
  align?: 'start' | 'end';
  setValue: (v: number | string) => void;
}

const toggleSelectorStyles = makeStyles(() => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    '& h4': {
      fontSize: '14px',
    },
  },
  buttonGroup: { display: 'flex' },
  button: {
    backgroundColor: 'white',
    height: '32px',
    width: '36px',
    padding: '4px',
    fontSize: '0.8rem',
    borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
  },
}));

function ToggleSelector({
  title,
  options,
  value,
  iconProp: _iconProp,
  align,
  setValue,
}: ToggleSelectorProps) {
  const classes = toggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Typography
        variant="h4"
        style={{ textAlign: align, marginRight: '0.5rem' }}
      >
        {title}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        className={classes.buttonGroup}
        style={{ justifyContent: align }}
      >
        {options.map(x => (
          <ToggleButton
            key={x.value}
            className={classes.button}
            value={x.value}
            onClick={() => {
              setValue(x.value);
            }}
            disabled={x.disabled}
          >
            {x.comp}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
// Mozambique - Blended Rainfall Aggregate (10-day) - May 2024

// The SectionToggle contain a toggle, a label, and (when opened) a container that animates open
function SectionToggle({
  title,
  children,
  expanded,
  handleChange,
  disabled,
  tooltip,
}: {
  title: string;
  children?: React.ReactNode;
  expanded: boolean;
  handleChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  disabled?: boolean;
  tooltip?: string;
}) {
  const classes = useStyles();

  const switchElement = (
    <div
      className={`${classes.collapsibleWrapper} ${
        expanded && children ? classes.collapsibleWrapperExpanded : ''
      }`}
    >
      <Switch
        checked={expanded}
        onChange={handleChange}
        title={title}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div>
      {tooltip ? (
        <Tooltip
          title={tooltip}
          arrow
          placement="top"
          classes={{ tooltip: classes.tooltip }}
        >
          {switchElement}
        </Tooltip>
      ) : (
        switchElement
      )}
      {children ? (
        <Collapse in={expanded} style={{ paddingLeft: '8px' }}>
          {children}
        </Collapse>
      ) : null}
    </div>
  );
}

function GreyContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      bgcolor="#F1F1F1"
      sx={{
        borderRadius: '4px',
        padding: 4,
      }}
    >
      {children}
    </Box>
  );
}

function GreyContainerSection({
  children,
  isLast,
}: {
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <>
      <Box sx={{ margin: 4 }}>{children}</Box>
      {!isLast && <Divider style={{ background: '#ffffff' }} />}
    </>
  );
}

const legendScaleSelectorOptions = [
  { value: 0.5, comp: <div>50%</div> },
  { value: 0.6, comp: <div>60%</div> },
  { value: 0.7, comp: <div>70%</div> },
  { value: 0.8, comp: <div>80%</div> },
  { value: 0.9, comp: <div>90%</div> },
  { value: 1, comp: <div>100%</div> },
];

const legendPositionOptions = [
  {
    value: 0,
    comp: (
      <Icon
        style={{
          color: 'black',
          transform: 'rotate(90deg)',
        }}
      >
        vertical_align_bottom
      </Icon>
    ),
  },
  {
    value: 1,
    comp: (
      <Icon style={{ color: 'black', transform: 'rotate(270deg)' }}>
        vertical_align_bottom
      </Icon>
    ),
  },
];

const logoPositionOptions = [
  {
    value: 0,
    comp: (
      <Icon
        style={{
          color: 'black',
          transform: 'rotate(90deg)',
        }}
      >
        vertical_align_bottom
      </Icon>
    ),
  },
  {
    value: 1,
    comp: (
      <Icon style={{ color: 'black', transform: 'rotate(270deg)' }}>
        vertical_align_bottom
      </Icon>
    ),
  },
];

const logoScaleSelectorOptions = [
  { value: 0.5, comp: <div style={{ fontSize: '0.75rem' }}>S</div> },
  { value: 1, comp: <div style={{ fontSize: '1rem' }}>M</div> },
  { value: 1.5, comp: <div style={{ fontSize: '1.25rem' }}>L</div> },
];

const footerTextSelectorOptions = [
  { value: 8, comp: <div style={{ fontSize: '8px' }}>Aa</div> },
  { value: 10, comp: <div style={{ fontSize: '10px' }}>Aa</div> },
  { value: 12, comp: <div style={{ fontSize: '12px' }}>Aa</div> },
  { value: 16, comp: <div style={{ fontSize: '16px' }}>Aa</div> },
  { value: 20, comp: <div style={{ fontSize: '20px' }}>Aa</div> },
];

// Suffix appended to title when batch maps is enabled
const DATE_PLACEHOLDER_SUFFIX = ': {date_coverage}';

function PrintConfig() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const location = useLocation();
  const { jobs: activeBatchJobs } = useBatchMapExportJobsState();
  const { dismissBatchMapExportJob } = useBatchMapExportJobsActions();
  const { printConfig } = useContext(PrintConfigContext);
  const [isPrismAuthenticated, setIsPrismAuthenticated] = useState(false);
  const [canManageSchedules, setCanManageSchedules] = useState(false);
  const [scheduleSessionStatus, setScheduleSessionStatus] =
    useState<ScheduleWhoamiSessionStatus>('unauthorized');

  // Local state for responsive input - syncs to parent with debounce
  const [localTitle, setLocalTitle] = useState(printConfig?.titleText ?? '');
  useEffect(() => {
    setLocalTitle(printConfig?.titleText ?? '');
  }, [printConfig?.titleText]);

  useEffect(() => {
    const scheduleMode = printConfig?.createScheduledMaps ?? false;
    if (!scheduleMode) {
      setIsPrismAuthenticated(false);
      setCanManageSchedules(false);
      setScheduleSessionStatus('unauthorized');
      return;
    }
    if (!printConfig?.open) {
      return;
    }
    const bypassCache =
      new URLSearchParams(location.search).get('schedule') === '1';
    let cancelled = false;
    void fetchScheduleWhoamiSession({ bypassCache }).then(result => {
      if (!cancelled) {
        setIsPrismAuthenticated(result.isPrismAuthenticated);
        setCanManageSchedules(result.canManageSchedules);
        setScheduleSessionStatus(result.sessionStatus);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location.search, printConfig?.open, printConfig?.createScheduledMaps]);

  // Appease TS by ensuring printConfig is defined
  if (!printConfig) {
    return null;
  }

  const {
    handleClose,
    titleText,
    setTitleText,
    debounceCallback,
    mapDimensions,
    setMapDimensions,
    logo,
    logoPosition,
    setLogoPosition,
    logoScale,
    setLogoScale,
    bottomLogo,
    bottomLogoScale,
    setBottomLogoScale,
    toggles,
    setToggles,
    legendPosition,
    setLegendPosition,
    setFooterText,
    footerTextSize,
    setFooterTextSize,
    download,
    downloadBatch,
    isDownloading,
    defaultFooterText,
    selectedBoundaries,
    setSelectedBoundaries,
    legendScale,
    setLegendScale,
    handleDownloadMenuOpen,
    handleDownloadMenuClose,
    downloadMenuAnchorEl,
    mapCount,
    shouldEnableBatchMaps,
    shouldShowMultiLayerWarning,
    dateRange,
    aspectRatioOptions,
    selectableLayers,
    selectedLayerId,
    setSelectedLayerId,
    createScheduledMaps,
    setCreateScheduledMaps,
    createSchedule,
    previewBounds,
  } = printConfig;

  const batchMapsWillTruncate =
    toggles.batchMapsVisibility && mapCount > MAP_EXPORT_MAX_URLS_PER_REQUEST;

  const handlePrimaryButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!createScheduledMaps) {
      handleDownloadMenuOpen(event);
      return;
    }
    if (!isPrismAuthenticated) {
      const params = new URLSearchParams(location.search);
      params.set('printModal', '1');
      params.set('batchMaps', '1');
      params.set('schedule', '1');
      const returnUrl = `${window.location.origin}${
        location.pathname
      }?${params.toString()}`;
      window.location.assign(
        `${PRISM_SIGN_IN_URL}?next=${encodeURIComponent(returnUrl)}`,
      );
      return;
    }
    if (!canManageSchedules) {
      return;
    }
    handleDownloadMenuOpen(event);
  };

  const primaryLabelKey = schedulePrimaryButtonLabelKey({
    createScheduledMaps,
    isPrismAuthenticated,
    canManageSchedules,
    selectedLayerId,
    hasPreviewBounds: Boolean(previewBounds),
  });
  const primaryButtonLabel =
    primaryLabelKey === 'export'
      ? t('Export')
      : primaryLabelKey === 'create_schedule'
        ? t('Create schedule')
        : t('Login to create schedule');

  const schedulePrimaryDisabled = isSchedulePrimaryDisabled({
    createScheduledMaps,
    isPrismAuthenticated,
    canManageSchedules,
    selectedLayerId,
    hasPreviewBounds: Boolean(previewBounds),
  });

  const primaryDisabled = isPrintPanelPrimaryDisabled({
    isDownloading,
    schedulePrimaryDisabled,
    createScheduledMaps,
    isPrismAuthenticated,
    batchMapsVisibility: toggles.batchMapsVisibility,
    hasCompleteDateRange: Boolean(dateRange.startDate && dateRange.endDate),
  });

  return (
    <Box className={classes.printPanelRoot}>
      <div className={classes.optionsContainer}>
        <div>
          <Box
            style={{
              fontSize: 14,
              fontWeight: 900,
              marginBottom: '1em',
            }}
            className={classes.title}
          >
            {t('Map Options')}
          </Box>
          <IconButton
            className={classes.closeButton}
            onClick={() => handleClose()}
          >
            <Cancel />
          </IconButton>
        </div>

        {/* Title */}
        <div className={classes.optionWrap}>
          <TextField
            value={localTitle}
            placeholder={t('Title')}
            fullWidth
            size="small"
            inputProps={{ label: t('Title'), style: { color: 'black' } }}
            onChange={event => {
              setLocalTitle(event.target.value);
              debounceCallback(setTitleText, event.target.value);
            }}
            variant="outlined"
          />
        </div>

        {/* Aspect Ratio */}
        <AspectRatioSelector
          value={mapDimensions.aspectRatio}
          options={aspectRatioOptions}
          setValue={val => {
            setMapDimensions({ aspectRatio: val as AspectRatio });
          }}
        />

        {/* Logo */}
        {logo && (
          <SectionToggle
            title={t('Logo')}
            expanded={toggles.logoVisibility}
            handleChange={({ target }) => {
              setToggles(prev => ({
                ...prev,
                logoVisibility: Boolean(target.checked),
              }));
              setLogoPosition(target.checked ? 0 : -1);
            }}
          >
            <GreyContainer>
              <GreyContainerSection isLast>
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <ToggleSelector
                    value={logoPosition}
                    options={logoPositionOptions}
                    iconProp={logoPosition}
                    setValue={(v: number | string) =>
                      setLogoPosition(Number(v))
                    }
                    title={t('Position')}
                  />

                  <div
                    // disable the legend scale if the legend is not visible
                    style={{
                      opacity: logoPosition !== -1 ? 1 : 0.5,
                      pointerEvents: logoPosition !== -1 ? 'auto' : 'none',
                    }}
                  >
                    <ToggleSelector
                      align="end"
                      value={logoScale}
                      options={logoScaleSelectorOptions}
                      setValue={(v: number | string) => setLogoScale(Number(v))}
                      title={t('Size')}
                    />
                  </div>
                </Box>
              </GreyContainerSection>
            </GreyContainer>
          </SectionToggle>
        )}

        {/* Bottom Logo */}
        {bottomLogo && (
          <SectionToggle
            title={t('Bottom Logo')}
            expanded={toggles.bottomLogoVisibility}
            handleChange={({ target }) => {
              setToggles(prev => ({
                ...prev,
                bottomLogoVisibility: Boolean(target.checked),
              }));
            }}
          >
            <GreyContainer>
              <GreyContainerSection isLast>
                <Box
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                  }}
                >
                  <ToggleSelector
                    align="end"
                    value={bottomLogoScale}
                    options={logoScaleSelectorOptions}
                    setValue={(v: number | string) =>
                      setBottomLogoScale(Number(v))
                    }
                    title={t('Size')}
                  />
                </Box>
              </GreyContainerSection>
            </GreyContainer>
          </SectionToggle>
        )}

        {/* Labels */}
        <SectionToggle
          title={t('Map Labels')}
          expanded={toggles.mapLabelsVisibility}
          handleChange={({ target }) =>
            setToggles(prev => ({
              ...prev,
              mapLabelsVisibility: Boolean(target.checked),
            }))
          }
        />

        {/* Admin Area */}
        <SectionToggle
          title={t('Admin Areas')}
          expanded={toggles.countryMask}
          handleChange={({ target }) =>
            setToggles(prev => ({
              ...prev,
              countryMask: Boolean(target.checked),
            }))
          }
        >
          <div className={classes.optionWrap}>
            <SimpleBoundaryDropdown
              selectAll
              labelMessage={t('Select admin area')}
              className={classes.formControl}
              selectedBoundaries={selectedBoundaries}
              setSelectedBoundaries={setSelectedBoundaries}
              selectProps={{
                variant: 'outlined',
                fullWidth: true,
              }}
              multiple={false}
              size="small"
            />
          </div>
        </SectionToggle>

        {/* Legend */}
        <SectionToggle
          title={t('Legend')}
          expanded={toggles.legendVisibility}
          handleChange={() => {
            setToggles(prev => ({
              ...prev,
              legendVisibility: !prev.legendVisibility,
            }));
          }}
        >
          <GreyContainer>
            <GreyContainerSection>
              <Box
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <ToggleSelector
                  value={legendPosition > -1 ? legendPosition : -1}
                  options={legendPositionOptions}
                  iconProp={legendPosition}
                  setValue={(v: number | string) =>
                    setLegendPosition(Number(v))
                  }
                  title={t('Position')}
                />
                <div className={classes.collapsibleWrapper}>
                  <Switch
                    title={t('Full Layer')}
                    checked={!!toggles.fullLayerDescription}
                    onChange={() => {
                      setToggles(prev => ({
                        ...prev,
                        fullLayerDescription: !toggles.fullLayerDescription,
                      }));
                    }}
                  />
                </div>
              </Box>
            </GreyContainerSection>
            <GreyContainerSection isLast>
              <div
                // disable the legend scale if the legend is not visible
                style={{
                  opacity: legendPosition !== -1 ? 1 : 0.5,
                  pointerEvents: legendPosition !== -1 ? 'auto' : 'none',
                }}
              >
                <ToggleSelector
                  value={legendScale}
                  options={legendScaleSelectorOptions}
                  setValue={(v: number | string) => setLegendScale(Number(v))}
                  title={t('Size')}
                />
              </div>
            </GreyContainerSection>
          </GreyContainer>
        </SectionToggle>

        {/* Footer */}
        <SectionToggle
          title={t('Footer')}
          expanded={toggles.footerVisibility}
          handleChange={() => {
            setToggles(prev => ({
              ...prev,
              footerVisibility: !prev.footerVisibility,
            }));
          }}
        >
          <GreyContainer>
            <GreyContainerSection>
              <ToggleSelector
                value={footerTextSize}
                options={footerTextSelectorOptions}
                setValue={(v: number | string) => setFooterTextSize(Number(v))}
                title={t('Size')}
              />
            </GreyContainerSection>
            <GreyContainerSection isLast>
              <TextField
                size="small"
                key={defaultFooterText}
                multiline
                defaultValue={defaultFooterText}
                inputProps={{ style: { color: 'black', fontSize: '0.8rem' } }}
                style={{ backgroundColor: 'white', borderRadius: '5px' }}
                minRows={3}
                maxRows={6}
                fullWidth
                onChange={event => {
                  debounceCallback(setFooterText, event.target.value);
                }}
                variant="outlined"
              />
            </GreyContainerSection>
          </GreyContainer>
        </SectionToggle>

        {/* Batch Maps */}
        {shouldEnableBatchMaps && (
          <Box className={classes.batchMapsSection}>
            <SectionToggle
              title={t('Create a sequence of maps')}
              expanded={toggles.batchMapsVisibility}
              disabled={shouldShowMultiLayerWarning}
              tooltip={t(
                shouldShowMultiLayerWarning
                  ? 'Select one layer at a time to create a sequence of maps'
                  : 'Selecting this option will apply the template above to create multiple maps over a time period of your choice.',
              )}
              handleChange={() => {
                const willBeEnabled = !toggles.batchMapsVisibility;

                if (willBeEnabled && !titleText.includes('{date}')) {
                  // Append date placeholder
                  setTitleText(prev => `${prev}${DATE_PLACEHOLDER_SUFFIX}`);
                } else if (
                  !willBeEnabled &&
                  titleText.endsWith(DATE_PLACEHOLDER_SUFFIX)
                ) {
                  // Remove date placeholder suffix
                  setTitleText(prev =>
                    prev.slice(0, -DATE_PLACEHOLDER_SUFFIX.length),
                  );
                }

                if (!willBeEnabled) {
                  setCreateScheduledMaps(false);
                }

                setToggles(prev => ({
                  ...prev,
                  batchMapsVisibility: willBeEnabled,
                }));
              }}
            />
            <SectionToggle
              title={t('Create maps for future data')}
              expanded={createScheduledMaps}
              disabled={!toggles.batchMapsVisibility}
              tooltip={t(
                'Selecting this option will apply the template above to create maps as new data becomes available.',
              )}
              handleChange={({ target }) => {
                if (!target.checked) {
                  handleDownloadMenuClose();
                }
                setCreateScheduledMaps(target.checked);
              }}
            >
              {createScheduledMaps &&
                scheduleSessionStatus === 'unauthorized' && (
                  <GreyContainer>
                    <GreyContainerSection isLast>
                      <Typography
                        variant="caption"
                        component="p"
                        className={classes.batchExportTruncateHint}
                      >
                        {t(
                          'Sign in is required to create scheduled maps. Use Login to create schedule below.',
                        )}
                      </Typography>
                    </GreyContainerSection>
                  </GreyContainer>
                )}
              {createScheduledMaps &&
                scheduleSessionStatus === 'network_error' && (
                  <GreyContainer>
                    <GreyContainerSection isLast>
                      <Typography
                        variant="caption"
                        component="p"
                        className={classes.batchExportTruncateHint}
                      >
                        {t(
                          'Could not verify your session. Check your connection and try again.',
                        )}
                      </Typography>
                    </GreyContainerSection>
                  </GreyContainer>
                )}
              {createScheduledMaps &&
                isPrismAuthenticated &&
                !canManageSchedules && (
                  <GreyContainer>
                    <GreyContainerSection isLast>
                      <Typography
                        variant="caption"
                        component="p"
                        className={classes.batchExportTruncateHint}
                      >
                        {t(
                          'You do not have permission to create schedules. Contact an administrator.',
                        )}
                      </Typography>
                    </GreyContainerSection>
                  </GreyContainer>
                )}
            </SectionToggle>
            {toggles.batchMapsVisibility && (
              <Box className={classes.batchMapsForm}>
                <GreyContainer>
                  <GreyContainerSection>
                    {/* Layer */}
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel>{t('Layer')}</InputLabel>
                      <Select
                        value={selectedLayerId ?? ''}
                        label={t('Layer')}
                        onChange={e =>
                          setSelectedLayerId(e.target.value as LayerKey)
                        }
                      >
                        {selectableLayers.map(layer => (
                          <MenuItem key={layer.id} value={layer.id}>
                            {t(layer.title)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </GreyContainerSection>
                  {!createScheduledMaps && (
                    <GreyContainerSection>
                      <DateRangePicker />
                    </GreyContainerSection>
                  )}
                  <GreyContainerSection isLast={createScheduledMaps}>
                    <CadenceSelector />
                  </GreyContainerSection>
                  {!createScheduledMaps && (
                    <GreyContainerSection isLast>
                      <Box className={classes.mapCountContainer}>
                        <Typography variant="body1">
                          {t('Number of maps generated')}
                        </Typography>
                        <Typography
                          variant="body1"
                          className={`${classes.mapCountValue}${
                            batchMapsWillTruncate
                              ? ` ${classes.mapCountValueWarning}`
                              : ''
                          }`}
                        >
                          {mapCount}
                        </Typography>
                      </Box>
                      {batchMapsWillTruncate && (
                        <Typography
                          variant="caption"
                          component="p"
                          className={classes.batchExportTruncateHint}
                        >
                          {t('batch_export_maps_truncated_panel', {
                            max: MAP_EXPORT_MAX_URLS_PER_REQUEST,
                          })}
                        </Typography>
                      )}
                    </GreyContainerSection>
                  )}
                </GreyContainer>
              </Box>
            )}
            {toggles.batchMapsVisibility && activeBatchJobs.length > 0 && (
              <Box className={classes.batchExportsInPanelWrap}>
                <GreyContainer>
                  <GreyContainerSection isLast>
                    <Typography
                      variant="h4"
                      style={{ marginBottom: '8px', fontWeight: 600 }}
                    >
                      {t('Batch map exports')}
                    </Typography>
                    <BatchMapExportJobRows
                      jobs={activeBatchJobs}
                      onDismiss={dismissBatchMapExportJob}
                      variant="panel"
                    />
                  </GreyContainerSection>
                </GreyContainer>
              </Box>
            )}
          </Box>
        )}

        <Button
          fullWidth
          variant="contained"
          color="primary"
          className={`${classes.gutter} ${
            primaryDisabled
              ? classes.primaryButtonDisabled
              : classes.primaryButtonActive
          }`}
          endIcon={<GetApp />}
          onClick={handlePrimaryButtonClick}
          disabled={primaryDisabled}
        >
          {isDownloading ? (
            <>
              <CircularProgress size={16} />{' '}
              <span style={{ marginLeft: '0.5rem' }}>
                {t('Generating maps...')}
              </span>
            </>
          ) : (
            <span>{primaryButtonLabel}</span>
          )}
        </Button>

        <Menu
          anchorEl={downloadMenuAnchorEl}
          keepMounted
          open={Boolean(downloadMenuAnchorEl)}
          onClose={handleDownloadMenuClose}
        >
          {createScheduledMaps && isPrismAuthenticated && canManageSchedules
            ? [
                <MenuItem
                  key="schedule-pdf"
                  onClick={() => {
                    handleDownloadMenuClose();
                    void createSchedule('pdf');
                  }}
                >
                  {t('Export maps as PDF')}
                </MenuItem>,
                <MenuItem
                  key="schedule-png"
                  onClick={() => {
                    handleDownloadMenuClose();
                    void createSchedule('png');
                  }}
                >
                  {t('Export maps as PNGs')}
                </MenuItem>,
              ]
            : toggles.batchMapsVisibility
              ? [
                  <MenuItem key="pdf" onClick={() => downloadBatch('pdf')}>
                    {t('Export maps as PDF')}
                  </MenuItem>,
                  <MenuItem key="png" onClick={() => downloadBatch('png')}>
                    {t('Export maps as PNGs')}
                  </MenuItem>,
                ]
              : [
                  <MenuItem key="png" onClick={() => download('png')}>
                    {t('Download PNG')}
                  </MenuItem>,
                  <MenuItem key="jpeg" onClick={() => download('jpeg')}>
                    {t('Download JPEG')}
                  </MenuItem>,
                  <MenuItem key="pdf" onClick={() => download('pdf')}>
                    {t('Download PDF')}
                  </MenuItem>,
                ]}
        </Menu>
      </div>
    </Box>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    printPanelRoot: {
      minWidth: 0,
      flexShrink: 1,
    },
    title: {
      color: theme.palette.text.secondary,
    },
    gutter: {
      marginBottom: 0,
    },
    primaryButtonActive: {
      backgroundColor: cyanBlue,
      color: 'black',
      '&:hover': {
        backgroundColor: cyanBlue,
      },
    },
    primaryButtonDisabled: {
      cursor: 'not-allowed',
      '&.Mui-disabled': {
        cursor: 'not-allowed',
        pointerEvents: 'auto',
        backgroundColor: theme.palette.grey[300],
        color: theme.palette.text.disabled,
      },
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
      zIndex: 10,
    },
    optionsContainer: {
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: '740px',
      width: '20.5rem',
      minWidth: 0,
      boxSizing: 'border-box',
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarGutter: 'stable',
      zIndex: 4,
      backgroundColor: 'white',
    },
    optionWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
    },
    collapsibleWrapper: {
      display: 'flex',
      alignItems: 'center',
      '& h4': {
        fontSize: '14px',
      },
    },
    collapsibleWrapperExpanded: {
      marginBottom: '0.25rem',
    },
    tooltip: {
      fontSize: '0.75em',
    },
    formControl: {
      width: '100%',
      '& > .MuiInputLabel-shrink': { display: 'none' },
      '& > .MuiInput-root': { margin: 0 },
      '& label': {
        color: '#000000',
        opacity: 0.6,
        fontSize: '14px',
        marginLeft: '10px',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
      },
    },
    sameRowToggles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    mapCountContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    },
    mapCountValue: {
      borderRadius: '4px',
      padding: theme.spacing(0.25, 0.75),
      margin: theme.spacing(0.5, 1),
      backgroundColor: theme.palette.grey[300],
      lineHeight: 1.2,
    },
    mapCountValueWarning: {
      color: theme.palette.error.main,
    },
    batchExportTruncateHint: {
      marginTop: theme.spacing(0.5),
      color: theme.palette.error.main,
    },
    batchMapsSection: {
      display: 'flex',
      flexDirection: 'column',
    },
    batchMapsForm: {
      paddingTop: '10px',
    },
    batchExportsInPanelWrap: {
      marginTop: theme.spacing(1.5),
      width: '100%',
      minWidth: 0,
    },
  }),
);

export interface PrintConfigProps {}

export default PrintConfig;
