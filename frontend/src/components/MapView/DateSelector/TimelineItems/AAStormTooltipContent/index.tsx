import { Box, Typography } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { formatInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { AAStormColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
import { DateRangeType } from 'config/types';
import {
  AADataSelector,
  loadStormReport,
  setSelectedStormName,
} from 'context/anticipatoryAction/AAStormStateSlice';
import { updateDateRange } from 'context/mapStateSlice';
import { WindState } from 'prism-common';
import { MouseEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFormattedDate } from 'utils/date-utils';
import { useUrlHistory } from 'utils/url-utils';

import { useWindStatesByTime } from '../hooks';
import {
  aaStormTooltipContainerSx,
  aaStormTooltipCycloneNameSx,
  aaStormTooltipCycloneRowSx,
  aaStormTooltipCyclonesContainerSx,
  aaStormTooltipDateAndCyclonesContainerSx,
  aaStormTooltipDateSx,
  aaStormTooltipTimeSx,
  aaStormTooltipToggleButtonSx,
} from '../timelineItemsStyles';

function AAStormTooltipContent({ date }: AAStormTooltipContentProps) {
  const { updateHistory } = useUrlHistory();
  const stormData = useSelector(AADataSelector);
  const allWindStates = useWindStatesByTime(date.value);
  const dispatch = useDispatch();

  const hourToggleHandler = (
    _event: MouseEvent<HTMLElement>,
    value: string,
    cycloneName: string,
  ) => {
    const [, dateValue] = value?.split('::') || ['', ''];
    const stormDate = new Date(dateValue);
    stormDate.setUTCHours(12);
    const time = stormDate.getTime();
    updateHistory('date', getFormattedDate(time, 'default') as string);
    dispatch(updateDateRange({ startDate: time }));
    dispatch(setSelectedStormName(cycloneName));
    dispatch(
      loadStormReport({
        date: dateValue,
        stormName: cycloneName || 'chido',
      }),
    );
  };

  const getButtonColor = (status: string | undefined) => {
    switch (status) {
      case WindState.monitoring:
        return '#e0e0e0';
      case WindState.ready:
        return '#63B2BD';
      case WindState.activated_48kt:
        return AAStormColors.categories.moderate.background;
      case WindState.activated_64kt:
        return AAStormColors.categories.severe.background;
      default:
        console.warn('status not found', status);
        return '#ffff';
    }
  };

  return (
    <Box sx={aaStormTooltipContainerSx}>
      <Box sx={aaStormTooltipDateAndCyclonesContainerSx}>
        <Box sx={aaStormTooltipCyclonesContainerSx}>
          {allWindStates
            .sort((a, b) =>
              (a.cycloneName || '').localeCompare(b.cycloneName || ''),
            )
            .map(windStates => (
              <Box key={windStates.cycloneName} sx={aaStormTooltipCycloneRowSx}>
                <Typography sx={aaStormTooltipCycloneNameSx}>
                  {windStates.cycloneName?.toUpperCase()}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  onChange={(e, value) =>
                    hourToggleHandler(e, value, windStates.cycloneName || '')
                  }
                  style={{ marginRight: '8px' }}
                >
                  {windStates?.states.map((item, index) => {
                    const itemDate = new Date(item.ref_time);
                    const formattedItemTime = formatInUTC(
                      itemDate,
                      "haaa 'UTC'",
                    );

                    return (
                      <ToggleButton
                        key={`${windStates.cycloneName}::${itemDate.valueOf()}::${index}`}
                        value={`${windStates.cycloneName?.toUpperCase()}::${item.ref_time}`}
                        onMouseDown={e => e.preventDefault()}
                        sx={aaStormTooltipToggleButtonSx}
                        style={{
                          backgroundColor: `${getButtonColor(item.state)}${
                            `${windStates.cycloneName?.toUpperCase()}::${item.ref_time}` ===
                            stormData.forecastDetails?.cyclone_name.toUpperCase() +
                              '::' +
                              stormData.forecastDetails?.reference_time
                              ? ''
                              : '50'
                          }`,
                        }}
                      >
                        <Typography sx={aaStormTooltipTimeSx}>
                          {formattedItemTime}
                        </Typography>
                      </ToggleButton>
                    );
                  })}
                </ToggleButtonGroup>
              </Box>
            ))}
        </Box>
        <Typography sx={aaStormTooltipDateSx}>
          {formatInUTC(new Date(date.value), 'MM/dd/yy')}
        </Typography>
      </Box>
    </Box>
  );
}

interface AAStormTooltipContentProps {
  date: DateRangeType;
}

export default AAStormTooltipContent;
