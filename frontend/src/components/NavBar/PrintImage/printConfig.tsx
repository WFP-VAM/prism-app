import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Theme,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { GetApp, Cancel } from '@material-ui/icons';
import React, { useContext } from 'react';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { cyanBlue } from 'muiTheme';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import Switch from 'components/Common/Switch';
import { AspectRatio } from 'components/MapExport/types';
import { useSafeTranslation } from '../../../i18n';
import PrintConfigContext from './printConfig.context';
import DateRangePicker from './DateRangePicker';
import AspectRatioSelector from './AspectRatioSelector';

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
}: {
  title: string;
  children?: React.ReactNode;
  expanded: boolean;
  handleChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  disabled?: boolean;
}) {
  const classes = useStyles();
  return (
    <div>
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
      <Collapse in={expanded}>{children}</Collapse>
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

function PrintConfig() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { printConfig } = useContext(PrintConfigContext);

  // Appease TS by ensuring printConfig is defined
  if (!printConfig) {
    return null;
  }

  const {
    handleClose,
    setTitleText,
    debounceCallback,
    country,
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
    dateRange,
    aspectRatioOptions,
  } = printConfig;

  return (
    <Box>
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
            defaultValue={country}
            placeholder={t('Title')}
            fullWidth
            size="small"
            inputProps={{ label: t('Title'), style: { color: 'black' } }}
            onChange={event => {
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
          <>
            <SectionToggle
              title={t('Create a sequence of maps')}
              expanded={toggles.batchMapsVisibility}
              handleChange={() => {
                setToggles(prev => ({
                  ...prev,
                  batchMapsVisibility: !prev.batchMapsVisibility,
                }));
              }}
            />
            <GreyContainer>
              <GreyContainerSection isLast={!toggles.batchMapsVisibility}>
                <Typography variant="body1">
                  {t(
                    'Selecting this option will apply the template above to create multiple maps over a time period of your choice.',
                  )}
                </Typography>
              </GreyContainerSection>
              {toggles.batchMapsVisibility && (
                <>
                  <GreyContainerSection>
                    <DateRangePicker />
                  </GreyContainerSection>
                  <GreyContainerSection isLast>
                    <Box className={classes.mapCountContainer}>
                      <Typography variant="body1">
                        {t('Nb of maps generated')}
                      </Typography>
                      <Typography
                        variant="body1"
                        className={classes.mapCountValue}
                      >
                        {mapCount}
                      </Typography>
                    </Box>
                  </GreyContainerSection>
                </>
              )}
            </GreyContainer>
          </>
        )}

        <Button
          style={{ backgroundColor: cyanBlue, color: 'black' }}
          variant="contained"
          color="primary"
          className={classes.gutter}
          endIcon={<GetApp />}
          onClick={e => handleDownloadMenuOpen(e)}
          disabled={
            isDownloading ||
            (toggles.batchMapsVisibility &&
              (!dateRange.startDate || !dateRange.endDate))
          }
        >
          {isDownloading ? (
            <>
              <CircularProgress size={16} />{' '}
              <span style={{ marginLeft: '0.5rem' }}>
                {t('Generating maps...')}
              </span>
            </>
          ) : (
            <span>{t('Download')}</span>
          )}
        </Button>

        <Menu
          anchorEl={downloadMenuAnchorEl}
          keepMounted
          open={Boolean(downloadMenuAnchorEl)}
          onClose={handleDownloadMenuClose}
        >
          {toggles.batchMapsVisibility
            ? [
                <MenuItem key="pdf" onClick={() => downloadBatch('pdf')}>
                  {t('Download maps as PDF')}
                </MenuItem>,
                <MenuItem key="png" onClick={() => downloadBatch('png')}>
                  {t('Download maps as PNGs')}
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
    title: {
      color: theme.palette.text.secondary,
    },
    gutter: {
      marginBottom: 10,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
    },
    optionsContainer: {
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: '740px',
      width: '19.2rem',
      overflow: 'auto',
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
      justifyContent: 'space-between',
    },
    mapCountValue: {
      border: '1px solid rgba(0, 0, 0, 0.23)',
      borderRadius: '4px',
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
    },
  }),
);

export interface PrintConfigProps {}

export default PrintConfig;
