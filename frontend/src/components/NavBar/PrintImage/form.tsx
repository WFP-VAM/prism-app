import {
  Box,
  Button,
  Collapse,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Theme,
  Typography,
  WithStyles,
  createStyles,
  makeStyles,
  withStyles,
} from '@material-ui/core';
import { GetApp, Cancel, Visibility, VisibilityOff } from '@material-ui/icons';
import React, { useCallback } from 'react';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { cyanBlue } from 'muiTheme';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { AdminCodeString } from 'config/types';
import { useSafeTranslation } from '../../../i18n';
import { MapDimensions, Toggles } from './printImage.types';

interface ToggleSelectorProps {
  title: string;
  value: number;
  options: {
    value: number;
    comp:
      | React.JSX.Element
      | (({ value }: { value: number }) => React.JSX.Element);
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
  },
  buttonGroup: { display: 'flex' },
  button: {
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
  iconProp,
  align,
  setValue,
}: ToggleSelectorProps) {
  const classes = toggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Typography variant="h4" style={{ textAlign: align }}>
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
            onClick={() => setValue(x.value)}
            disabled={x.disabled}
          >
            {typeof x.comp === 'function' ? (
              <x.comp value={Number(iconProp)} />
            ) : (
              x.comp
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

// The SectionToggle contain a toggle, a label, and (when opened) a container that animates open
function SectionToggle({
  title,
  children,
  expanded,
  handleChange,
  classes,
}: {
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  handleChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => void;
  classes: any;
}) {
  console.log('expanded', expanded);
  return (
    <>
      <Switch
        checked={expanded}
        onChange={handleChange}
        className={classes.switch}
        color="primary"
        classes={{
          switchBase: classes.switchBase,
          track: classes.switchTrack,
        }}
      />
      <Typography variant="h4">{title}</Typography>
      <Collapse in={expanded}>{children}</Collapse>
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

// A function that returns Visibility if the element is off, else returns a switch icon to flip the position
const renderPositionIcon = ({
  value,
}: {
  value: number;
}): React.JSX.Element => {
  return (
    <Icon style={{ color: 'black' }}>
      {value % 2 === 0 ? 'switch_left' : 'switch_right'}
    </Icon>
  );
};

const legendPositionOptions = [
  { value: -1, comp: <VisibilityOff /> },
  {
    value: 0,
    comp: renderPositionIcon,
  },
];

const logoPositionOptions = [
  { value: -1, comp: <VisibilityOff /> },
  {
    value: 0,
    comp: renderPositionIcon,
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
  { value: 0, comp: <VisibilityOff /> },
  { value: 8, comp: <div style={{ fontSize: '8px' }}>Aa</div> },
  { value: 10, comp: <div style={{ fontSize: '10px' }}>Aa</div> },
  { value: 12, comp: <div style={{ fontSize: '12px' }}>Aa</div> },
  { value: 16, comp: <div style={{ fontSize: '16px' }}>Aa</div> },
  { value: 20, comp: <div style={{ fontSize: '20px' }}>Aa</div> },
];

const layerDescriptionSelectorOptions = [
  { value: 0, comp: <VisibilityOff /> },
  { value: 1, comp: <Visibility /> },
];

const countryMaskSelectorOptions = [
  { value: 1, comp: <VisibilityOff /> },
  { value: 0, comp: <Visibility /> },
];

const mapLabelsVisibilityOptions = [
  { value: 0, comp: <VisibilityOff /> },
  { value: 1, comp: <Visibility /> },
];

type ExpandedSections = {
  logos: boolean;
  labels: boolean;
  adminAreas: boolean;
  legend: boolean;
  footer: boolean;
};

function DownloadFormUI({
  classes,
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
}: DownloadFormUIProps) {
  const { t } = useSafeTranslation();

  // list of expandible section
  const [expandedSections, setExpandedSections] = React.useState<
    ExpandedSections
  >({
    logos: false,
    labels: false,
    adminAreas: false,
    legend: false,
    footer: false,
  });

  const toggleExpanded = useCallback(
    (section: keyof typeof expandedSections) => () => {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    },
    [expandedSections],
  );

  return (
    <div className={classes.optionsContainer}>
      <div>
        <Box fontSize={14} fontWeight={900} mb={1} className={classes.title}>
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
        <div className={classes.sameRowToggles}>
          <ToggleSelector
            value={logoPosition > -1 ? 0 : -1}
            options={logoPositionOptions}
            iconProp={logoPosition}
            setValue={v =>
              setLogoPosition(prev =>
                v === -1 && prev !== -1 ? -1 : (prev + 1) % 2,
              )
            }
            title={t('Logo Position')}
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
              title={t('Logo Size')}
            />
          </div>
        </div>
      )}

      {/* Labels */}
      <SectionToggle
        title={t('Map Labels')}
        classes={classes}
        expanded={expandedSections.labels}
        handleChange={toggleExpanded('labels')}
      >
        <ToggleSelector
          value={Number(toggles.mapLabelsVisibility)}
          options={mapLabelsVisibilityOptions}
          setValue={val =>
            setToggles(prev => ({
              ...prev,
              mapLabelsVisibility: Boolean(val),
            }))
          }
          align="end"
          title={t('Map Labels')}
        />
      </SectionToggle>

      {/* Admin Area */}
      <ToggleSelector
        value={Number(toggles.countryMask)}
        options={countryMaskSelectorOptions}
        setValue={val =>
          setToggles(prev => ({
            ...prev,
            countryMask: Boolean(val),
          }))
        }
        title={t('Admin Area Mask')}
      />
      {toggles.countryMask && (
        <div className={classes.optionWrap}>
          <Typography variant="h4">{t('Select admin area')}</Typography>
          <SimpleBoundaryDropdown
            selectAll
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
      )}

      {/* Legend */}
      <SectionToggle
        title={t('Legend')}
        classes={classes}
        expanded={expandedSections.legend}
        handleChange={toggleExpanded('legend')}
      >
        <ToggleSelector
          value={legendPosition > -1 ? 0 : -1}
          options={legendPositionOptions}
          iconProp={legendPosition}
          setValue={v =>
            setLegendPosition(prev =>
              v === -1 && prev !== -1 ? -1 : (prev + 1) % 2,
            )
          }
          title={t('Legend Position')}
        />
        <ToggleSelector
          value={Number(toggles.fullLayerDescription)}
          options={layerDescriptionSelectorOptions}
          setValue={val =>
            setToggles(prev => ({
              ...prev,
              fullLayerDescription: Boolean(val),
            }))
          }
          align="end"
          title={t('Full Layer Description')}
        />
      </SectionToggle>

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
          title={t('Legend Size')}
        />
      </div>

      {/* Footer */}
      <ToggleSelector
        value={footerTextSize}
        options={footerTextSelectorOptions}
        setValue={setFooterTextSize}
        title={t('Footer Text')}
      />

      <TextField
        size="small"
        key={defaultFooterText}
        multiline
        defaultValue={defaultFooterText}
        inputProps={{ style: { color: 'black', fontSize: '0.9rem' } }}
        minRows={3}
        maxRows={3}
        onChange={event => {
          debounceCallback(setFooterText, event.target.value);
        }}
        variant="outlined"
      />

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
        <MenuItem onClick={() => download('png')}>{t('Download PNG')}</MenuItem>
        <MenuItem onClick={() => download('jpeg')}>
          {t('Download JPEG')}
        </MenuItem>
        <MenuItem onClick={() => download('pdf')}>{t('Download PDF')}</MenuItem>
      </Menu>
    </div>
  );
}

const styles = (theme: Theme) =>
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
      gap: '0.8rem',
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
    formControl: {
      width: '100%',
      '& > .MuiInputLabel-shrink': { display: 'none' },
      '& > .MuiInput-root': { margin: 0 },
      '& label': {
        textTransform: 'uppercase',
        letterSpacing: '3px',
        fontSize: '11px',
        position: 'absolute',
        top: '-13px',
      },
    },
    sameRowToggles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    switch: {
      padding: '7px',
    },
    switchTrack: {
      backgroundColor: '#E0E0E0',
      borderRadius: '12px',
    },
    switchRipple: {
      backgroundColor: cyanBlue,
    },
    switchBase: {
      color: '#CECECE',
      '&.Mui-checked': {
        color: 'white',
      },
      '& .MuiSwitch-thumb': {
        boxShadow:
          '0px 1px 1px -1px rgba(0,0,0,0.2),0px 0px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
      },
      '&.Mui-checked + MuiTouchRipple-root': {
        backgroundColor: cyanBlue,
      },
      '&.Mui-checked + .MuiSwitch-track': {
        backgroundColor: cyanBlue,
        opacity: 0.8,
      },
    },
  });

export interface DownloadFormUIProps extends WithStyles<typeof styles> {
  handleClose: () => void;
  setTitleText: React.Dispatch<React.SetStateAction<string>>;
  debounceCallback: (
    setState: React.Dispatch<React.SetStateAction<string>>,
    value: string,
  ) => void;
  country: string;
  mapDimensions: MapDimensions;
  setMapDimensions: React.Dispatch<React.SetStateAction<MapDimensions>>;
  logo: string;
  logoPosition: number;
  setLogoPosition: React.Dispatch<React.SetStateAction<number>>;
  logoScale: number;
  setLogoScale: React.Dispatch<React.SetStateAction<number>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  legendPosition: number;
  setLegendPosition: React.Dispatch<React.SetStateAction<number>>;
  setFooterText: React.Dispatch<React.SetStateAction<string>>;
  footerTextSize: number;
  setFooterTextSize: React.Dispatch<React.SetStateAction<number>>;
  downloadMenuAnchorEl: HTMLElement | null;
  handleDownloadMenuOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleDownloadMenuClose: () => void;
  download: (format: 'pdf' | 'jpeg' | 'png') => void;
  defaultFooterText: string;
  selectedBoundaries: AdminCodeString[];
  setSelectedBoundaries: React.Dispatch<
    React.SetStateAction<AdminCodeString[]>
  >;
  legendScale: number;
  setLegendScale: React.Dispatch<React.SetStateAction<number>>;
}

export default withStyles(styles)(DownloadFormUI);
