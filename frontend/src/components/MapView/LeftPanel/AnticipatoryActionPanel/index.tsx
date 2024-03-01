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
import HomeTable, { RowProps } from './HomeTable';
import AAIcon from './HomeTable/AAIcon';
import { StyledRadioLabel } from './utils';

const dummyAreas = [
  { name: 'Mapai', isNew: true },
  { name: 'Kolomna', isNew: false },
  { name: 'Saraf', isNew: true },
  { name: 'Glarus', isNew: false },
  { name: 'Brampton', isNew: true },
  { name: 'Xanadu', isNew: false },
  { name: 'Zephyr', isNew: true },
  { name: 'Quetzaltenango', isNew: false },
  { name: 'Wakanda', isNew: true },
  { name: 'Atlantis', isNew: false },
];

const buttons = [
  { icon: GetApp, text: 'Assets' },
  { icon: EditOutlined, text: 'Report' },
  { icon: BarChartOutlined, text: 'Forecast' },
];

const links = [
  { text: 'Group assumptions', href: 'google.com' },
  { text: 'How to read this screen', href: 'google.com' },
];

function AnticipatoryActionPanel() {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const rows: RowProps[] = [
    {
      id: 'header',
      iconContent: null,
      windows: [[], []],
      header: ['window 1', 'window 2'],
    },
    {
      id: 'set_sev',
      iconContent: (
        <AAIcon
          background="#831F00"
          topText="S"
          bottomText="SEV"
          color="white"
        />
      ),
      windows: [dummyAreas.slice(0, 2), dummyAreas.slice(0, 3)],
    },
    {
      id: 'ready_sev',
      iconContent: (
        <AAIcon
          background="#E63701"
          topText="R"
          bottomText="SEV"
          color="white"
        />
      ),
      windows: [dummyAreas.slice(3, 6), dummyAreas.slice(6, 7)],
    },
    {
      id: 'set_mod',
      iconContent: (
        <AAIcon
          background="#FF8934"
          topText="S"
          bottomText="MOD"
          color="black"
        />
      ),
      windows: [[], dummyAreas.slice(0, 1)],
    },
    {
      id: 'ready_mod',
      iconContent: (
        <AAIcon
          background="#FFD52D"
          topText="R"
          bottomText="MOD"
          color="black"
        />
      ),
      windows: [dummyAreas.slice(0, 1), []],
    },
    {
      id: 'na',
      iconContent: (
        <AAIcon
          background="#F1F1F1"
          topText="na"
          bottomText="-"
          color="black"
        />
      ),
      windows: [[], []],
    },
    {
      id: 'ny',
      iconContent: (
        <AAIcon
          background={`repeating-linear-gradient(
        -45deg,
        #F1F1F1,
        #F1F1F1 10px,
        white 10px,
        white 20px
      )`}
          topText="ny"
          bottomText="-"
          color="black"
        />
      ),
      windows: [[], []],
    },
  ];

  return (
    <div className={classes.anticipatoryActionPanel}>
      {/* header */}
      <div className={classes.headerWrapper}>
        {/* Title area */}
        <div>
          <Typography variant="h2">Phases: global view</Typography>
        </div>
        {/* window select */}
        <div>
          <FormControl component="fieldset">
            <RadioGroup defaultValue="all" className={classes.radioButtonGroup}>
              <StyledRadioLabel value="all" label="All" />
              <StyledRadioLabel value="window1" label="Window 1" />
              <StyledRadioLabel value="window2" label="Window 2" />
            </RadioGroup>
          </FormControl>
        </div>
      </div>
      {/* main view */}
      <HomeTable rows={rows} />
      {/* footer */}
      <div className={classes.footerWrapper}>
        {/* actions */}
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
        {/* links */}
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
    },
    headerWrapper: {
      padding: '1rem',
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
