import 'react-datepicker/dist/react-datepicker.css';

import { Box } from '@mui/material';
import { DateRangeType } from 'config/types';
import { WindState } from 'prism-common';

import { useWindStatesByTime } from '../hooks';
import {
  aaStormActivated1IndicatorSx,
  aaStormActivated2IndicatorSx,
  aaStormEmptySpaceSx,
  aaStormLowRiskIndicatorSx,
  aaStormReadyIndicatorSx,
} from '../timelineItemsStyles';

function AAStormTimelineItem({ currentDate }: AAStormTimelineItemProps) {
  const allWindStates = useWindStatesByTime(currentDate.value);

  const flattenedWindStates = allWindStates.flatMap(
    windStates => windStates.states,
  );

  const getIndicatorSx = () => {
    if (flattenedWindStates.length === 0) {
      return aaStormEmptySpaceSx;
    }

    const states = flattenedWindStates.map(({ state }) => state);

    if (states.includes(WindState.activated_64kt)) {
      return aaStormActivated2IndicatorSx;
    }
    if (states.includes(WindState.activated_48kt)) {
      return aaStormActivated1IndicatorSx;
    }
    if (states.includes(WindState.ready)) {
      return aaStormReadyIndicatorSx;
    }
    return aaStormLowRiskIndicatorSx;
  };

  return <Box sx={getIndicatorSx()} role="presentation" />;
}

interface AAStormTimelineItemProps {
  currentDate: DateRangeType;
}

export default AAStormTimelineItem;
