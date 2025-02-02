import { createStyles, makeStyles } from '@material-ui/core';

import 'react-datepicker/dist/react-datepicker.css';
import { DateRangeType } from 'config/types';
import { WindState } from 'context/anticipatoryAction/AAStormStateSlice/types';
import { TIMELINE_ITEM_WIDTH } from '../../utils';
import { useWindStatesByTime } from '../hooks';

function AAStormTimelineItem({ currentDate }: AAStormTimelineItemProps) {
  const allWindStates = useWindStatesByTime(currentDate.value);
  const classes = useStyles();

  const flattenedWindStates = allWindStates.flatMap(
    windStates => windStates.states,
  );

  const getStylingClass = () => {
    if (flattenedWindStates.length === 0) {
      return classes.emptySpace;
    }
    if (
      flattenedWindStates.find(({ state }) => state === WindState.activated_118)
    ) {
      return classes.activated2Indicator;
    }

    if (
      flattenedWindStates.find(({ state }) => state === WindState.activated_64)
    ) {
      return classes.activated1Indicator;
    }

    if (flattenedWindStates.find(({ state }) => state === WindState.ready)) {
      return classes.readyIndicator;
    }

    return classes.lowRiskIndicator;
  };

  return <div className={getStylingClass()} />;
}

const useStyles = makeStyles(() =>
  createStyles({
    emptySpace: {
      position: 'absolute',
      height: 10,
      width: TIMELINE_ITEM_WIDTH - 1,
      top: 0,
    },
    lowRiskIndicator: {
      position: 'absolute',
      height: 12,
      width: TIMELINE_ITEM_WIDTH - 1,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#63B2BD',
    },
    readyIndicator: {
      position: 'absolute',
      height: 16,
      width: TIMELINE_ITEM_WIDTH - 1,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#FFD014',
    },
    activated1Indicator: {
      position: 'absolute',
      height: 20,
      width: TIMELINE_ITEM_WIDTH - 1,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#FF8934',
    },
    activated2Indicator: {
      position: 'absolute',
      height: 24,
      width: TIMELINE_ITEM_WIDTH - 1,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#E63701',
    },
  }),
);
interface AAStormTimelineItemProps {
  currentDate: DateRangeType;
}
export default AAStormTimelineItem;
