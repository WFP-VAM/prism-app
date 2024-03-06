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
import { useSelector } from 'react-redux';
import {
  AnticipatoryActionData,
  AnticipatoryActionDataSelector,
} from 'context/anticipatoryActionStateSlice';
import { useUrlHistory } from 'utils/url-utils';
import HomeTable, { RowProps } from './HomeTable';
import AAIcon from './HomeTable/AAIcon';
import { StyledRadioLabel } from './utils';

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
  const AAData = useSelector(AnticipatoryActionDataSelector);
  // TODO: move this to redux state
  const [selectedWindow, setSelectedWindow] = React.useState<string>('all');
  const { urlParams } = useUrlHistory();

  const urlDate = React.useMemo(() => {
    return urlParams.get('date');
  }, [urlParams]);

  const AADateSameDate = React.useMemo(
    () => AAData.filter(x => x.date === urlDate),
    [AAData, urlDate],
  );

  const windows = React.useMemo(
    () => [...new Map(AAData.map(x => [x.windows, x.windows])).keys()],
    [AAData],
  );

  const setSev = React.useMemo(
    () =>
      AADateSameDate.filter(x => x.category === 'Severo' && x.phase === 'Set'),
    [AADateSameDate],
  );
  const readySev = React.useMemo(
    () =>
      AADateSameDate.filter(
        x => x.category === 'Severo' && x.phase === 'Ready',
      ),
    [AADateSameDate],
  );
  const setMod = React.useMemo(
    () =>
      AADateSameDate.filter(
        x => x.category === 'Moderado' && x.phase === 'Set',
      ),
    [AADateSameDate],
  );
  const readyMod = React.useMemo(
    () =>
      AADateSameDate.filter(
        x => x.category === 'Moderado' && x.phase === 'Ready',
      ),
    [AADateSameDate],
  );

  // TODO: is this the definition of na and ny?
  const na = React.useMemo(
    () =>
      AADateSameDate.filter(x => x.category === 'Leve' && x.phase === 'Set'),
    [AADateSameDate],
  );
  const ny = React.useMemo(
    () =>
      AADateSameDate.filter(x => x.category === 'Leve' && x.phase === 'Ready'),
    [AADateSameDate],
  );

  // -1 means all
  const selectedWindowIndex = windows.findIndex(x => x === selectedWindow);

  const headerRow: RowProps = {
    id: 'header',
    iconContent: null,
    windows: selectedWindowIndex === -1 ? windows.map(x => []) : [[]],
    header:
      selectedWindowIndex === -1
        ? [...windows]
        : [windows[selectedWindowIndex]],
  };

  function getWindowData(data: AnticipatoryActionData[], window: number) {
    return data
      .filter(x => x.windows === windows[window])
      .map(x => ({ name: x.district, isNew: false }));
  }

  function windowData(data: AnticipatoryActionData[]) {
    return selectedWindowIndex === -1
      ? windows.map((x, index) => getWindowData(data, index))
      : [getWindowData(data, selectedWindowIndex)];
  }

  const rows: RowProps[] = [
    headerRow,
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
      windows: windowData(setSev),
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
      windows: windowData(readySev),
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
      windows: windowData(setMod),
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
      windows: windowData(readyMod),
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
      windows: windowData(na),
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
      windows: windowData(ny),
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
            <RadioGroup
              defaultValue="all"
              className={classes.radioButtonGroup}
              onChange={(e, val) => setSelectedWindow(val)}
            >
              <StyledRadioLabel value="all" label="All" />
              {windows.map(x => (
                <StyledRadioLabel key={x} value={x} label={x} />
              ))}
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
