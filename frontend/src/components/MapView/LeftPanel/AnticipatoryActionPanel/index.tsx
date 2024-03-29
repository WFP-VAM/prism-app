import {
  Button,
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
import {
  GetApp,
  EditOutlined,
  BarChartOutlined,
  ArrowBackIos,
  ClearAll,
  Equalizer,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  AACategoryType,
  allWindowsKey,
} from 'context/anticipatoryActionStateSlice/types';
import { AAWindowKeys } from 'config/utils';
import {
  AADataSelector,
  AAFiltersSelector,
  AAMonitoredDistrictsSelector,
  AASelectedDistrictSelector,
  setAAFilters,
  setAASelectedDistrict,
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
import ActionsModal from './DistrictView/ActionsModal';

const homeButtons = [
  { icon: GetApp, text: 'Assets' },
  { icon: EditOutlined, text: 'Report' },
  { icon: BarChartOutlined, text: 'Forecast' },
];

const districtButtons = [
  { icon: ClearAll, text: 'Timeline' },
  { icon: Equalizer, text: 'Forecast' },
];

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
  const [indexOptions, setIndexOptions] = React.useState<string[]>([]);
  const [actionsModalOpen, setActionsModalOpen] = React.useState<boolean>(
    false,
  );

  const dialogs = [
    { text: 'Group assumptions', onclick: () => {} },
    {
      text: 'How to read this screen',
      onclick: () => setActionsModalOpen(true),
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
      <ActionsModal
        open={actionsModalOpen}
        onClose={() => setActionsModalOpen(false)}
      />
      <div className={classes.headerWrapper}>
        <div className={classes.titleSelectWrapper}>
          <div className={classes.titleSelectWrapper}>
            {selectedDistrict && (
              <IconButton onClick={() => dispatch(setAASelectedDistrict(''))}>
                <ArrowBackIos fontSize="small" />
              </IconButton>
            )}
            <StyledSelect
              value={selectedDistrict || 'empty'}
              fullWidth
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h2">
                  {selectedDistrict || 'Phases: global view'}
                </Typography>
              )}
            >
              {monitoredDistricts.map(x => (
                <MenuItem
                  key={x}
                  value={x}
                  onClick={() => {
                    dispatch(setAASelectedDistrict(x));
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
                onChange: e => {
                  const { checked } = e.target;
                  dispatch(setAAFilters({ categories: { [x.id]: checked } }));
                },
              }}
              label={x.label}
            />
          ))}
        </div>

        {selectedDistrict && (
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
      {selectedDistrict === '' && <HomeTable />}
      {selectedDistrict !== '' && <DistrictView />}
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
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              className={classes.footerLink}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {dialog.text}
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
