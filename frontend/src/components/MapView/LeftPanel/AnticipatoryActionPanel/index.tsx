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
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import HomeTable, { RowProps } from './HomeTable';
import { AAIcons, StyledRadioLabel } from './utils';

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
  const RawAAData = useSelector(AnticipatoryActionDataSelector);
  const MonitoredDistricts = [...new Set(RawAAData.map(x => x.district))];
  // eslint-disable-next-line no-console
  console.log(MonitoredDistricts);

  const AAData = RawAAData.filter(
    x => x.probability !== 'NA' && Number(x.probability) > Number(x.trigger),
  );
  // TODO: move this to redux state
  const [selectedWindow, setSelectedWindow] = React.useState<string>('all');
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const date = getFormattedDate(selectedDate, DateFormat.Default);

  const AADateSameDate = React.useMemo(
    () => AAData.filter(x => x.date === date),
    [AAData, date],
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

  // TODO - LEVE is "MILD" and should be added as a new category, see Figma.
  const setMild = React.useMemo(
    () =>
      AADateSameDate.filter(x => x.category === 'Leve' && x.phase === 'Set'),
    [AADateSameDate],
  );
  const readyMild = React.useMemo(
    () =>
      AADateSameDate.filter(x => x.category === 'Leve' && x.phase === 'Ready'),
    [AADateSameDate],
  );

  // eslint-disable-next-line no-console
  console.log(setMild, readyMild);

  // TODO: implement NA and NY
  // NA means that no proba is above the trigger for that district
  // NY means that the district is not monitored yet (no rows for the district)
  const na = React.useMemo(() => [], []);
  const ny = React.useMemo(() => [], []);

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
      iconContent: AAIcons.set_sev,
      windows: windowData(setSev),
    },
    {
      id: 'ready_sev',
      iconContent: AAIcons.ready_sev,
      windows: windowData(readySev),
    },
    {
      id: 'set_mod',
      iconContent: AAIcons.set_mod,
      windows: windowData(setMod),
    },
    {
      id: 'ready_mod',
      iconContent: AAIcons.ready_mod,
      windows: windowData(readyMod),
    },
    {
      id: 'na',
      iconContent: AAIcons.na,
      windows: windowData(na),
    },
    {
      id: 'ny',
      iconContent: AAIcons.ny,
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
