import { ArrowBackIos } from '@mui/icons-material';
import {
  Box,
  FormControl,
  IconButton,
  Input,
  MenuItem,
  RadioGroup,
  Typography,
} from '@mui/material';
import { usePostHog } from '@posthog/react';
import { AnticipatoryAction, PanelSize } from 'config/types';
import { AAWindowKeys } from 'config/utils';
import {
  AAFiltersSelector,
  AAMonitoredDistrictsSelector,
  AASelectedDistrictSelector,
  AAViewSelector,
  setAAFilters,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAView,
  allWindowsKey,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';

import { aaDroughtPanelSx } from '../aaPanelStyles';
import HowToReadModal from '../HowToReadModal';
import { useAnticipatoryAction } from '../useAnticipatoryAction';
import { StyledSelect } from '../utils';
import DistrictView from './DistrictView/index';
import Forecast from './Forecast';
import HomeTable from './HomeTable';
import Timeline from './Timeline';
import { StyledCheckboxLabel, StyledRadioLabel } from './utils';
import {
  getAADroughtCountryConfig,
  isSingleWindowMode,
} from './utils/countryConfig';

const { categories } = getAADroughtCountryConfig();

function AnticipatoryActionDroughtPanel() {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const posthog = usePostHog();
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.drought);
  const monitoredDistricts = useSelector(AAMonitoredDistrictsSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const { categories: categoryFilters, selectedIndex } =
    useSelector(AAFiltersSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const view = useSelector(AAViewSelector);
  const [indexOptions, setIndexOptions] = React.useState<string[]>([]);
  const [howToReadModalOpen, setHowToReadModalOpen] = React.useState(false);

  const dialogs = [
    {
      text: 'How to read this screen',
      onclick: () => setHowToReadModalOpen(true),
    },
  ];

  React.useEffect(() => {
    if (!selectedDistrict) {
      return;
    }
    const entries = Object.values(AAData)
      .map(x => x[selectedDistrict])
      .flat()
      .filter(x => x);

    const options = [...new Set(entries.map(x => x.index))];
    setIndexOptions(options);
  }, [AAData, selectedDistrict]);

  return (
    <Box
      sx={aaDroughtPanelSx.anticipatoryActionPanel}
      style={{
        width: (() => {
          switch (view) {
            case AAView.Home:
              return PanelSize.medium;
            case AAView.District:
              return PanelSize.auto;
            case AAView.Timeline:
              return PanelSize.auto;
            case AAView.Forecast:
              return PanelSize.large;

            default:
              console.error(`No width configured for panel ${view}`);
              return PanelSize.auto;
          }
        })(),
      }}
    >
      <HowToReadModal
        open={howToReadModalOpen}
        onClose={() => setHowToReadModalOpen(false)}
      />
      <Box sx={aaDroughtPanelSx.headerWrapper}>
        <Box sx={aaDroughtPanelSx.titleSelectWrapper}>
          <Box sx={aaDroughtPanelSx.titleSelectWrapper}>
            {(view === AAView.District ||
              view === AAView.Timeline ||
              view === AAView.Forecast) && (
              <IconButton
                onClick={() => {
                  if (view === AAView.District) {
                    dispatch(setAASelectedDistrict(''));
                    dispatch(setAAView(AAView.Home));
                    return;
                  }
                  if (view === AAView.Timeline) {
                    dispatch(setAAView(AAView.District));
                    dispatch(setAAFilters({ selectedIndex: '' }));
                    return;
                  }
                  if (view === AAView.Forecast) {
                    dispatch(setAAView(AAView.District));
                  }
                }}
                size="large"
              >
                <ArrowBackIos fontSize="small" />
              </IconButton>
            )}
            <StyledSelect
              value={selectedDistrict || 'empty'}
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h2">
                  {t(selectedDistrict) || t('Summary')}{' '}
                  {view === AAView.Timeline && t('Timeline')}
                  {view === AAView.Forecast && t('Forecast')}
                </Typography>
              )}
            >
              <MenuItem
                value="empty"
                onClick={() => {
                  dispatch(setAASelectedDistrict(''));
                  dispatch(setAAView(AAView.Home));
                }}
              >
                {t('Summary')}
              </MenuItem>
              {monitoredDistricts.map(x => (
                <MenuItem
                  key={x.name}
                  value={x.name}
                  onClick={() => {
                    posthog?.capture('anticipatory_action_district_selected', {
                      district: x.name,
                      vulnerability: x.vulnerability,
                    });
                    dispatch(setAASelectedDistrict(x.name));
                    if (view === AAView.Home) {
                      dispatch(setAAView(AAView.District));
                    }
                  }}
                >
                  {t(x.name)}
                </MenuItem>
              ))}
            </StyledSelect>
          </Box>
        </Box>

        {!isSingleWindowMode() && (
          <div>
            <FormControl component="fieldset">
              <RadioGroup
                defaultValue={allWindowsKey}
                sx={aaDroughtPanelSx.radioButtonGroup}
                onChange={(_e, val) =>
                  dispatch(setAAFilters({ selectedWindow: val as any }))
                }
              >
                <StyledRadioLabel
                  value={allWindowsKey}
                  label={t(allWindowsKey)}
                />
                {AAWindowKeys.map(x => (
                  <StyledRadioLabel key={x} value={x} label={x} />
                ))}
              </RadioGroup>
            </FormControl>
          </div>
        )}

        <div>
          {categories.map(x => (
            <StyledCheckboxLabel
              key={x.id}
              id={x.id}
              checkBoxProps={{
                checked: categoryFilters[x.id],
                disabled: x.id !== 'Mild',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const { checked } = e.target;
                  dispatch(setAAFilters({ categories: { [x.id]: checked } }));
                },
              }}
              label={t(x.label)}
            />
          ))}
        </div>
        {!selectedDistrict && (
          <Typography>
            {t('Summary data as of ')}
            {getFormattedDate(selectedDate, 'locale')}
          </Typography>
        )}

        {view === AAView.District && (
          <Typography>
            {t(
              monitoredDistricts.find(x => x.name === selectedDistrict)
                ?.vulnerability || '',
            )}
          </Typography>
        )}
        {view === AAView.Timeline && (
          <div>
            <StyledSelect
              value={selectedIndex || 'empty'}
              fullWidth
              input={<Input disableUnderline />}
              renderValue={() => (
                <Typography variant="h3">
                  {t(selectedIndex) || t('Indicators')}
                </Typography>
              )}
            >
              <MenuItem
                value="empty"
                onClick={() => {
                  dispatch(setAAFilters({ selectedIndex: '' }));
                }}
              >
                {t('All')}
              </MenuItem>
              {indexOptions.map(x => (
                <MenuItem
                  key={x}
                  value={x}
                  onClick={() => {
                    dispatch(setAAFilters({ selectedIndex: x }));
                  }}
                >
                  {t(x)}
                </MenuItem>
              ))}
            </StyledSelect>
          </div>
        )}
      </Box>
      {view === AAView.Home && <HomeTable dialogs={dialogs} />}
      {view === AAView.District && <DistrictView dialogs={dialogs} />}
      {view === AAView.Timeline && <Timeline dialogs={dialogs} />}
      {view === AAView.Forecast && <Forecast dialogs={dialogs} />}
    </Box>
  );
}

export default AnticipatoryActionDroughtPanel;
