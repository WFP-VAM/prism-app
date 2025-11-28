import React, { useContext } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Theme,
  Collapse,
  Divider,
  Icon,
} from '@mui/material';
import { Cancel, GetApp } from '@mui/icons-material';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { cyanBlue } from 'muiTheme';
import { useSafeTranslation } from 'i18n';
import Switch from 'components/Common/Switch';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import DashboardExportContext from './dashboardExport.context';

// Helper components
interface ToggleSelectorProps {
  title: string;
  value: number;
  options: {
    value: number;
    comp: React.JSX.Element;
    disabled?: boolean;
  }[];
  align?: 'start' | 'end';
  setValue: (v: number) => void;
}

function ToggleSelector({
  title,
  options,
  value,
  align,
  setValue,
}: ToggleSelectorProps) {
  const classes = useToggleSelectorStyles();
  return (
    <div className={classes.wrapper}>
      <Box
        component="h4"
        style={{ textAlign: align, marginRight: '0.5rem', color: 'black' }}
      >
        {title}
      </Box>
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
            {x.comp}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

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
      <Icon style={{ color: 'black', transform: 'rotate(90deg)' }}>
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
      <Icon style={{ color: 'black', transform: 'rotate(90deg)' }}>
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

function DashboardExportConfig() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { exportConfig } = useContext(DashboardExportContext);

  const logoScaleSelectorOptions = [
    { value: 0.5, comp: <div style={{ fontSize: '0.75rem' }}>{t('S')}</div> },
    { value: 1, comp: <div style={{ fontSize: '1rem' }}>{t('M')}</div> },
    { value: 1.5, comp: <div style={{ fontSize: '1.25rem' }}>{t('L')}</div> },
  ];

  if (!exportConfig) {
    return null;
  }

  const {
    handleClose,
    download,
    isExporting,
    toggles,
    setToggles,
    logoPosition,
    setLogoPosition,
    logoScale,
    setLogoScale,
    legendPosition,
    setLegendPosition,
    legendScale,
    setLegendScale,
    selectedBoundaries,
    setSelectedBoundaries,
    handleDownloadMenuOpen,
    handleDownloadMenuClose,
    downloadMenuAnchorEl,
  } = exportConfig;

  return (
    <Box className={classes.configContainer}>
      <div>
        <Box className={classes.title}>{t('Export Options')}</Box>
        <IconButton className={classes.closeButton} onClick={handleClose}>
          <Cancel />
        </IconButton>
      </div>

      {/* Logo */}
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
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <ToggleSelector
                value={logoPosition}
                options={logoPositionOptions}
                setValue={setLogoPosition}
                title={t('Position')}
              />
              <div
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

      {/* Map Labels */}
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

      {/* Admin Areas */}
      <SectionToggle
        title={t('Admin Areas')}
        expanded={toggles.adminAreasVisibility}
        handleChange={({ target }) =>
          setToggles(prev => ({
            ...prev,
            adminAreasVisibility: Boolean(target.checked),
          }))
        }
      >
        <Box className={classes.optionWrap}>
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
        </Box>
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
            <ToggleSelector
              value={legendPosition > -1 ? legendPosition : -1}
              options={legendPositionOptions}
              setValue={setLegendPosition}
              title={t('Position')}
            />
          </GreyContainerSection>
          <GreyContainerSection isLast>
            <div
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

      <Button
        style={{ backgroundColor: cyanBlue, color: 'black' }}
        variant="contained"
        color="primary"
        className={classes.gutter}
        endIcon={<GetApp />}
        onClick={e => handleDownloadMenuOpen(e)}
        disabled={isExporting}
      >
        {isExporting ? t('Exporting...') : t('Download')}
      </Button>
      <Menu
        anchorEl={downloadMenuAnchorEl}
        keepMounted
        open={Boolean(downloadMenuAnchorEl)}
        onClose={handleDownloadMenuClose}
      >
        <MenuItem onClick={() => download('pdf')}>{t('Download PDF')}</MenuItem>
        <MenuItem onClick={() => download('png')}>{t('Download PNG')}</MenuItem>
      </Menu>
    </Box>
  );
}

const useToggleSelectorStyles = makeStyles(() => ({
  wrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    '& h4': {
      fontSize: '14px',
      margin: 0,
    },
  },
  buttonGroup: { display: 'flex', flexWrap: 'wrap' },
  button: {
    backgroundColor: 'white',
    height: '32px',
    width: '36px',
    padding: '4px',
    fontSize: '0.8rem',
    borderLeft: '1px solid rgba(0, 0, 0, 0.12) !important',
  },
}));

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    configContainer: {
      display: 'flex',
      height: '100%',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: '740px',
      scrollbarGutter: 'stable',
      overflow: 'auto',
      zIndex: 4,
      backgroundColor: 'white',
    },
    title: {
      fontSize: 14,
      fontWeight: 900,
      marginBottom: '1em',
      color: theme.palette.text.secondary,
    },
    closeButton: {
      position: 'absolute',
      right: theme.spacing(1),
      top: theme.spacing(1),
    },
    optionWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      marginBottom: '0.5rem',
    },
    gutter: {
      marginTop: 16,
      marginBottom: 10,
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
  }),
);

export default DashboardExportConfig;
