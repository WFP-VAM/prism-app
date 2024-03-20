import {
  Button,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  RadioGroup,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { black, cyanBlue } from 'muiTheme';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import {
  GetApp,
  EditOutlined,
  BarChartOutlined,
  ExpandMore,
  ArrowBackIos,
  ClearAll,
  Equalizer,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  AACategoryFiltersSelector,
  AAMonitoredDistrictsSelector,
  setCategoryFilters,
  setSelectedWindow,
} from 'context/anticipatoryActionStateSlice';
import {
  AACategoryType,
  allWindowsKey,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import HomeTable from './HomeTable';
import { StyledCheckboxLabel, StyledRadioLabel } from './utils';
import DistrictView from './DistrictView/index';

const homeButtons = [
  { icon: GetApp, text: 'Assets' },
  { icon: EditOutlined, text: 'Report' },
  { icon: BarChartOutlined, text: 'Forecast' },
];

const districtButtons = [
  { icon: ClearAll, text: 'Timeline' },
  { icon: Equalizer, text: 'Forecast' },
];

const links = [
  { text: 'Group assumptions', href: 'google.com' },
  { text: 'How to read this screen', href: 'google.com' },
];

const checkboxes: {
  label: string;
  id: Exclude<AACategoryType, 'na' | 'ny'>;
}[] = [
  { label: 'Severe', id: 'Severo' },
  { label: 'Moderate', id: 'Moderado' },
  { label: 'Mild', id: 'Leve' },
];

function AnticipatoryActionPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const categoryFilters = useSelector(AACategoryFiltersSelector);
  const monitoredDistricts = useSelector(AAMonitoredDistrictsSelector);
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>('');
  const [
    districtAnchorEl,
    setDistrictAnchorEl,
  ] = React.useState<null | HTMLElement>(null);

  const handleDistrictClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDistrictAnchorEl(event.currentTarget);
  };

  const handleDistrictClose = () => {
    setDistrictAnchorEl(null);
  };

  return (
    <div className={classes.anticipatoryActionPanel}>
      <div className={classes.headerWrapper}>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            {selectedDistrict && (
              <IconButton onClick={() => setSelectedDistrict('')}>
                <ArrowBackIos fontSize="small" />
              </IconButton>
            )}
            <Typography variant="h2">
              {selectedDistrict || 'Phases: global view'}
            </Typography>
          </div>

          <IconButton onClick={handleDistrictClick}>
            <ExpandMore />
          </IconButton>
          <Menu
            anchorEl={districtAnchorEl}
            keepMounted
            open={Boolean(districtAnchorEl)}
            onClose={handleDistrictClose}
          >
            <MenuItem
              value=""
              onClick={() => {
                setSelectedDistrict('');
                handleDistrictClose();
              }}
            >
              Phases: global view
            </MenuItem>
            {monitoredDistricts.map(x => (
              <MenuItem
                key={x}
                value={x}
                onClick={() => {
                  setSelectedDistrict(x);
                  handleDistrictClose();
                }}
              >
                {x}
              </MenuItem>
            ))}
          </Menu>
        </div>

        <div>
          <FormControl component="fieldset">
            <RadioGroup
              defaultValue={allWindowsKey}
              className={classes.radioButtonGroup}
              onChange={(e, val) => dispatch(setSelectedWindow(val as any))}
            >
              <StyledRadioLabel value={allWindowsKey} label="All" />
              {AAWindowKeys.map(x => (
                <StyledRadioLabel key={x} value={x} label={x} />
              ))}
            </RadioGroup>
          </FormControl>
        </div>
        <div>
          {checkboxes.map(x => (
            <StyledCheckboxLabel
              key={x.id}
              id={x.id}
              checkBoxProps={{
                checked: categoryFilters[x.id],
                onChange: e => {
                  const { checked } = e.target;
                  dispatch(setCategoryFilters({ [x.id]: checked }));
                },
              }}
              label={x.label}
            />
          ))}
        </div>
      </div>
      {selectedDistrict === '' && (
        <HomeTable setSelectedDistrict={setSelectedDistrict} />
      )}
      {selectedDistrict !== '' && (
        <DistrictView selectedDistrict={selectedDistrict} />
      )}
      {/* TODO: consider moving this part to each sub-component */}
      <div className={classes.footerWrapper}>
        <div className={classes.footerActionsWrapper}>
          {(selectedDistrict !== '' ? districtButtons : homeButtons).map(x => (
            <Button
              key={x.text}
              className={classes.footerButton}
              variant="outlined"
              fullWidth
              startIcon={<x.icon />}
            >
              <Typography>{t(x.text)}</Typography>
            </Button>
          ))}
        </div>
        <div className={classes.footerLinksWrapper}>
          {links.map(link => (
            <Typography
              key={link.text}
              className={classes.footerLink}
              component="a"
              target="_blank"
              rel="noopener noreferrer"
              href={link.href}
            >
              {link.text}
            </Typography>
          ))}
        </div>
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    anticipatoryActionPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      height: '100%',
      justifyContent: 'space-between',
    },
    headerWrapper: {
      padding: '1rem 1rem 0 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.50rem',
    },
    radioButtonGroup: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    footerWrapper: { display: 'flex', flexDirection: 'column' },
    footerActionsWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
      gap: '1rem',
    },
    footerLinksWrapper: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: '0.5rem',
    },
    footerButton: { borderColor: cyanBlue, color: black },
    footerLink: { textDecoration: 'underline' },
    titleSelectWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  }),
);

export default AnticipatoryActionPanel;
