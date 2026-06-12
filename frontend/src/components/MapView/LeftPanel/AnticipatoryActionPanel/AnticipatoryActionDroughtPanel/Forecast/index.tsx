import { ClearAll, Reply } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  AADataSelector,
  AAFiltersSelector,
  AASelectedDistrictSelector,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import {
  AAcategory,
  AACategoryType,
  AAView,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { Scatter } from 'react-chartjs-2';
import { useDispatch, useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';

import { aaCommonSx, aaForecastSx } from '../../aaPanelStyles';
import { getAAColor } from '../utils';
import { chartOptions, forecastTransform, getChartData } from './utils';

interface ForecastProps {
  dialogs: {
    text: string;
    onclick: () => void;
  }[];
}

function Forecast({ dialogs }: ForecastProps) {
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const AAData = useSelector(AADataSelector);
  const selectedDistrict = useSelector(AASelectedDistrictSelector);
  const filters = useSelector(AAFiltersSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  const { chartData, indexes } = forecastTransform({
    data: AAData,
    filters,
    selectedDistrict,
  });

  const forecastButtons = [
    {
      icon: Reply,
      text: 'Back',
      onClick: () => dispatch(setAAView(AAView.District)),
    },
    {
      icon: ClearAll,
      text: t('Timeline'),
      onClick: () => dispatch(setAAView(AAView.Timeline)),
    },
  ];

  if (indexes.length === 0) {
    return (
      <Box sx={aaForecastSx.noData}>
        <Typography>
          {t(
            `No data available yet for ${selectedDistrict}. Please pick a later date.`,
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h3" style={{ marginLeft: '1rem' }}>
        {t('Forecast data as of ')}
        {getFormattedDate(selectedDate, 'locale', t('date_locale'))}
      </Typography>
      <Box sx={aaForecastSx.charts}>
        <Box sx={aaForecastSx.chartsHeader}>
          <Box sx={{ minWidth: '3rem' }} />
          {indexes.map(x => (
            <Typography key={x} sx={aaForecastSx.label}>
              {t(x)}
            </Typography>
          ))}
          <Box sx={{ minWidth: '10px' }} />
        </Box>

        {Object.entries(chartData)
          .filter(([sev, _]) => filters.categories[sev as AACategoryType])
          .sort((a, b) => {
            const indexA = AAcategory.findIndex(x => x === a[0]);
            const indexB = AAcategory.findIndex(x => x === b[0]);

            if (indexA > indexB) {
              return -1;
            }
            if (indexA < indexB) {
              return 1;
            }
            return 0;
          })
          .map(([sev, indexData]) => {
            const color = getAAColor(sev as AACategoryType, 'Ready');
            return (
              <Box sx={aaForecastSx.chartLine} key={sev}>
                <Box
                  sx={aaForecastSx.textWrap}
                  style={{ backgroundColor: color }}
                >
                  <Typography
                    sx={aaForecastSx.text}
                    style={{
                      color: sev === 'Severe' ? 'white' : ' black',
                      border: `1px solid ${
                        sev === 'Severe' ? 'white' : ' black'
                      }`,
                    }}
                  >
                    {t(sev)}
                  </Typography>
                </Box>

                <Box sx={aaForecastSx.chartWrapper}>
                  <Scatter
                    data={getChartData(indexData, color) as any}
                    plugins={[ChartDataLabels]}
                    options={chartOptions as any}
                  />
                </Box>
              </Box>
            );
          })}
      </Box>
      <Box sx={aaCommonSx.footerWrapperVert}>
        <Box sx={aaCommonSx.footerActionsWrapper}>
          {forecastButtons.map(x => (
            <Button
              key={x.text}
              sx={aaCommonSx.footerButton}
              variant="outlined"
              fullWidth
              onClick={x.onClick}
              startIcon={<x.icon />}
            >
              <Typography>{t(x.text)}</Typography>
            </Button>
          ))}
        </Box>
        <Box sx={aaCommonSx.footerDialogsWrapperVert}>
          {dialogs.map(dialog => (
            <Typography
              key={dialog.text}
              sx={aaCommonSx.footerDialog}
              component="button"
              onClick={() => dialog.onclick()}
            >
              {t(dialog.text)}
            </Typography>
          ))}
        </Box>
      </Box>
    </>
  );
}

export default Forecast;
