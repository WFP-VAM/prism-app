import { createStyles, makeStyles } from '@material-ui/core';

import 'react-datepicker/dist/react-datepicker.css';
import { DateRangeType } from 'config/types';
import { TIMELINE_ITEM_WIDTH } from '../../utils';
import { WindState } from './types';
import { useWindStatesByTime } from '../hooks';

function AAStormTimelineItem({ currentDate }: AAStormTimelineItemProps) {
  const windStates = useWindStatesByTime(currentDate.value);
  const classes = useStyles();

  const getStylingClass = () => {
    if (windStates.length === 0) {
      return classes.emptySpace;
    }

    if (windStates.find(({ state }) => state === WindState.activated_118)) {
      return classes.activated2Indicator;
    }

    if (windStates.find(({ state }) => state === WindState.activated_64)) {
      return classes.activated1Indicator;
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
      width: TIMELINE_ITEM_WIDTH,
      top: 0,
    },
    lowRiskIndicator: {
      position: 'absolute',
      height: 10,
      width: TIMELINE_ITEM_WIDTH,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#63B2BD',
    },
    activated1Indicator: {
      position: 'absolute',
      height: 10,
      width: TIMELINE_ITEM_WIDTH,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#FF8934',
    },
    activated2Indicator: {
      position: 'absolute',
      height: 25,
      width: TIMELINE_ITEM_WIDTH,
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
