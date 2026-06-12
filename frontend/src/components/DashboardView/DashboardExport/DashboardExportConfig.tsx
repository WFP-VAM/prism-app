import { Cancel, GetApp } from '@mui/icons-material';
import {
  Box,
  Button,
  Collapse,
  Divider,
  Icon,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from 'components/Common/Switch';
import { SimpleBoundaryDropdown } from 'components/MapView/Layers/BoundaryDropdown';
import { useSafeTranslation } from 'i18n';
import { cyanBlue } from 'muiTheme';
import React, { useContext } from 'react';

import DashboardExportContext from './dashboardExport.context';
import {
  dashboardExportCollapsibleWrapperExpandedSx,
  dashboardExportCollapsibleWrapperSx,
  dashboardExportConfigCloseButtonSx,
  dashboardExportConfigContainerSx,
  dashboardExportConfigGutterSx,
  dashboardExportConfigOptionWrapSx,
  dashboardExportConfigTitleSx,
  dashboardExportFormControlSx,
  toggleSelectorButtonGroupSx,
  toggleSelectorButtonSx,
  toggleSelectorWrapperSx,
} from './dashboardExportStyles';

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
  return (
    <Box sx={toggleSelectorWrapperSx}>
      <Box
        component="h4"
        style={{ textAlign: align, marginRight: '0.5rem', color: 'black' }}
      >
        {title}
      </Box>
      <ToggleButtonGroup
        value={value}
        exclusive
        sx={toggleSelectorButtonGroupSx}
        style={{ justifyContent: align }}
      >
        {options.map(x => (
          <ToggleButton
            key={x.value}
            sx={toggleSelectorButtonSx}
            value={x.value}
            onClick={() => setValue(x.value)}
            disabled={x.disabled}
          >
            {x.comp}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
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
  return (
    <Box>
      <Box
        sx={
          [
            dashboardExportCollapsibleWrapperSx,
            expanded && children
              ? dashboardExportCollapsibleWrapperExpandedSx
              : undefined,
          ] as SxProps<Theme>
        }
      >
        <Switch checked={expanded} onChange={handleChange} title={title} />
      </Box>
      <Collapse in={expanded}>{children}</Collapse>
    </Box>
  );
}

function GreyContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: '#F1F1F1',
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
    <Box sx={dashboardExportConfigContainerSx}>
      <div>
        <Box sx={dashboardExportConfigTitleSx}>{t('Export Options')}</Box>
        <IconButton
          sx={dashboardExportConfigCloseButtonSx}
          onClick={handleClose}
          size="large"
        >
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
        <Box sx={dashboardExportConfigOptionWrapSx}>
          <Box sx={dashboardExportFormControlSx}>
            <SimpleBoundaryDropdown
              className=""
              selectAll
              labelMessage={t('Select admin area')}
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
        sx={dashboardExportConfigGutterSx}
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

export default DashboardExportConfig;
