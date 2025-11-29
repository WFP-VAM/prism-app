import {
  Box,
  Button,
  Collapse,
  Divider,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Theme,
  Typography,
} from '@mui/material';
import { GetApp, Cancel } from '@mui/icons-material';
import { makeStyles, createStyles } from '@mui/styles';
import React, { useContext } from 'react';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { cyanBlue } from 'muiTheme';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import Switch from 'components/Common/Switch';
import { useSafeTranslation } from '../../../i18n';
import PrintConfigContext, { MapDimensions } from './printConfig.context';

interface ToggleSelectorProps {
  title: string;
  value: number;
  options: {
    value: number;
    comp: React.JSX.Element;
    disabled?: boolean;
  }[];
  iconProp?: number;
  align?: 'start' | 'end';
  setValue: (v: number) => void;
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
}: {
  title: string;
  children?: React.ReactNode;
  expanded: boolean;
  handleChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
}) {
  const classes = useStyles();
  return (
    <div>
      <div
        className={`${classes.collapsibleWrapper} ${
          expanded && children ? classes.collapsibleWrapperExpanded : ''
        }`}
      >
        <Switch checked={expanded} onChange={handleChange} title={title} />
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
  { value: 0.4, comp: <div>60%</div> },
  { value: 0.3, comp: <div>70%</div> },
  { value: 0.2, comp: <div>80%</div> },
  { value: 0.1, comp: <div>90%</div> },
  { value: 0, comp: <div>100%</div> },
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

const mapWidthSelectorOptions = [
  { value: 50, comp: <div>50%</div> },
  { value: 60, comp: <div>60%</div> },
  { value: 70, comp: <div>70%</div> },
  { value: 80, comp: <div>80%</div> },
  { value: 90, comp: <div>90%</div> },
  { value: 100, comp: <div>100%</div> },
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
    toggles,
    setToggles,
    legendPosition,
    setLegendPosition,
    setFooterText,
    footerTextSize,
    setFooterTextSize,
    download,
    defaultFooterText,
    selectedBoundaries,
    setSelectedBoundaries,
    legendScale,
    setLegendScale,
    handleDownloadMenuOpen,
    handleDownloadMenuClose,
    downloadMenuAnchorEl,
  } = printConfig;

  return (
    <Box
      style={{
        overflow: 'scroll',
      }}
    >
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

        {/* Width */}
        <ToggleSelector
          value={mapDimensions.width}
          options={mapWidthSelectorOptions}
          setValue={val =>
            setMapDimensions((prev: MapDimensions) => ({
              ...(prev || {}),
              width: val as number,
            }))
          }
          title={t('Map Width')}
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
                    setValue={setLogoPosition}
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
                      setValue={setLogoScale}
                      title={t('Size')}
                    />
                  </div>
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
                  setValue={setLegendPosition}
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
                  setValue={setLegendScale}
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
                setValue={setFooterTextSize}
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

        <Button
          style={{ backgroundColor: cyanBlue, color: 'black' }}
          variant="contained"
          color="primary"
          className={classes.gutter}
          endIcon={<GetApp />}
          onClick={e => handleDownloadMenuOpen(e)}
        >
          {t('Download')}
        </Button>
        <Menu
          anchorEl={downloadMenuAnchorEl}
          keepMounted
          open={Boolean(downloadMenuAnchorEl)}
          onClose={handleDownloadMenuClose}
        >
          <MenuItem onClick={() => download('png')}>
            {t('Download PNG')}
          </MenuItem>
          <MenuItem onClick={() => download('jpeg')}>
            {t('Download JPEG')}
          </MenuItem>
          <MenuItem onClick={() => download('pdf')}>
            {t('Download PDF')}
          </MenuItem>
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
      scrollbarGutter: 'stable',
      overflow: 'auto',
      paddingRight: '15px',
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
  }),
);

export interface PrintConfigProps {}

export default PrintConfig;
