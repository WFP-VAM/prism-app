import {
  Button,
  FormControl,
  RadioGroup,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { PanelSize } from 'config/types';
import { black, cyanBlue } from 'muiTheme';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import { GetApp, EditOutlined, BarChartOutlined } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  AACategoryFiltersSelector,
  AACategoryType,
  allWindowsKey,
  AnticipatoryActionWindowsSelector,
  setCategoryFilters,
  setSelectedWindow,
} from 'context/anticipatoryActionStateSlice';
import HomeTable from './HomeTable';
import { StyledCheckboxLabel, StyledRadioLabel } from './utils';

const buttons = [
  { icon: GetApp, text: 'Assets' },
  { icon: EditOutlined, text: 'Report' },
  { icon: BarChartOutlined, text: 'Forecast' },
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
  const windows = useSelector(AnticipatoryActionWindowsSelector);
  const categoryFilters = useSelector(AACategoryFiltersSelector);

  const windowOptions = [allWindowsKey, ...windows];

  return (
    <div className={classes.anticipatoryActionPanel}>
      <div className={classes.headerWrapper}>
        <div>
          <Typography variant="h2">Phases: global view</Typography>
        </div>
        <div>
          <FormControl component="fieldset">
            <RadioGroup
              defaultValue={allWindowsKey}
              className={classes.radioButtonGroup}
              onChange={(e, val) => dispatch(setSelectedWindow(val))}
            >
              {windowOptions.map(x => (
                <StyledRadioLabel key={x} value={x} label={x} />
              ))}
            </RadioGroup>
          </FormControl>
        </div>
        <div>
          {checkboxes.map(x => (
            <StyledCheckboxLabel
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
      <HomeTable />
      <div className={classes.footerWrapper}>
        <div className={classes.footerActionsWrapper}>
          {buttons.map(x => (
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
      width: PanelSize.medium,
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
  }),
);

export default AnticipatoryActionPanel;
