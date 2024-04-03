import {
  FormControl,
  IconButton,
  Input,
  MenuItem,
  RadioGroup,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { black, cyanBlue } from 'muiTheme';
import React from 'react';
import { useSafeTranslation } from 'i18n';
import { ArrowBackIos } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  AACategoryType,
  AAView,
  allWindowsKey,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AAMonitoredDistrictsSelector,
  AASelectedDistrictSelector,
  AAViewSelector,
  setAAFilters,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryActionStateSlice';
import { availableDatesSelector } from 'context/serverStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import {
  getAAAvailableDatesCombined,
  getRequestDate,
} from 'utils/server-utils';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import { StyledCheckboxLabel, StyledRadioLabel, StyledSelect } from './utils';
import DistrictView from './DistrictView/index';
import HomeTable from './HomeTable';
import HowToReadModal from './HowToReadModal';
import Timeline from './Timeline';

const checkboxes: {
  label: string;
  id: Exclude<AACategoryType, 'na' | 'ny'>;
}[] = [
  { label: 'Severe', id: 'Severe' },
  { label: 'Moderate', id: 'Moderate' },
  { label: 'Mild', id: 'Mild' },
];

function AnticipatoryActionPanel() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const monitoredDistricts = useSelector(AAMonitoredDistrictsSelector);
  const { categories: categoryFilters, selectedIndex } = useSelector(
    AAFiltersSelector,
  );
  const serverAvailableDates = useSelector(availableDatesSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const aaData = useSelector(AADataSelector);
  const view = useSelector(AAViewSelector);
  const [indexOptions, setIndexOptions] = React.useState<string[]>([]);
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  const dialogs = [
    { text: 'Group assumptions', onclick: () => {} },
    {
      text: 'How to read this screen',
      onclick: () => setHowToReadModalOpen(true),
    },
  ];

  React.useEffect(() => {
    if (!selectedDistrict) {
      return;
    }
    const entries = Object.values(aaData)
      .map(x => x[selectedDistrict])
      .flat()
      .filter(x => x);

    const options = [...new Set(entries.map(x => x.index))];
    setIndexOptions(options);
  }, [aaData, selectedDistrict]);

  const layerAvailableDates = getAAAvailableDatesCombined(serverAvailableDates);
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);
  const date = getFormattedDate(queryDate, DateFormat.Default) as string;

  React.useEffect(() => {
    dispatch(setAAFilters({ selectedDate: date }));
  }, [date, dispatch]);

  return (
    <div className={classes.anticipatoryActionPanel}>
      <HowToReadModal
        open={howToReadModalOpen}
        onClose={() => setHowToReadModalOpen(false)}
      />
      <div className={classes.headerWrapper}>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            {(view === AAView.District || view === AAView.Timeline) && (
              <IconButton
                onClick={() => {
                  if (view === AAView.District) {
                    dispatch(setAASelectedDistrict(''));
                    dispatch(setAAView(AAView.Home));
                    return;
                  }
                  if (view === AAView.Timeline) {
                    dispatch(setAAView(AAView.District));
                  }
                }}
              >
                <ArrowBackIos fontSize="small" />
              </IconButton>
            )}
            <StyledSelect
              value={selectedDistrict || 'empty'}
              fullWidth
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h2">
                  {selectedDistrict || 'Phases: global view'}{' '}
                  {view === AAView.Timeline && t('Timeline')}
                </Typography>
              )}
            >
              <MenuItem
                value=""
                onClick={() => {
                  dispatch(setAASelectedDistrict(''));
                  dispatch(setAAView(AAView.Home));
                }}
              >
                Global view
              </MenuItem>
              {monitoredDistricts.map(x => (
                <MenuItem
                  key={x}
                  value={x}
                  onClick={() => {
                    dispatch(setAASelectedDistrict(x));
                    dispatch(setAAView(AAView.District));
                  }}
                >
                  {x}
                </MenuItem>
              ))}
            </StyledSelect>
          </div>
        </div>

        <div>
          <FormControl component="fieldset">
            <RadioGroup
              defaultValue={allWindowsKey}
              className={classes.radioButtonGroup}
              onChange={(e, val) =>
                dispatch(setAAFilters({ selectedWindow: val as any }))
              }
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
                disabled: x.id !== 'Mild',
                onChange: e => {
                  const { checked } = e.target;
                  dispatch(setAAFilters({ categories: { [x.id]: checked } }));
                },
              }}
              label={x.label}
            />
          ))}
        </div>

        {(view === AAView.District || view === AAView.Timeline) && (
          <div>
            <StyledSelect
              value={selectedIndex || 'empty'}
              fullWidth
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h3">
                  {selectedIndex || 'Emergency triggers'}
                </Typography>
              )}
            >
              <MenuItem
                value=""
                onClick={() => {
                  dispatch(setAAFilters({ selectedIndex: '' }));
                }}
              >
                All
              </MenuItem>
              {indexOptions.map(x => (
                <MenuItem
                  key={x}
                  value={x}
                  onClick={() => {
                    dispatch(setAAFilters({ selectedIndex: x }));
                  }}
                >
                  {x}
                </MenuItem>
              ))}
            </StyledSelect>
          </div>
        )}
      </div>
      {view === AAView.Home && <HomeTable dialogs={dialogs} />}
      {view === AAView.District && <DistrictView dialogs={dialogs} />}
      {view === AAView.Timeline && <Timeline dialogs={dialogs} />}
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
    footerLink: {
      textDecoration: 'underline',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
    },
    titleSelectWrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
  }),
);

export default AnticipatoryActionPanel;
