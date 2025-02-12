import { createStyles, makeStyles } from '@material-ui/core';

import 'react-datepicker/dist/react-datepicker.css';
import { DateRangeType } from 'config/types';
import { WindState } from 'prism-common/dist/types/anticipatory-action-storm/windState';
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

    const states = flattenedWindStates.map(({ state }) => state);

    if (states.includes(WindState.activated_64kt)) {
      return classes.activated2Indicator;
    }
    if (states.includes(WindState.activated_48kt)) {
      return classes.activated1Indicator;
    }
    if (states.includes(WindState.ready)) {
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
      backgroundColor: '#b5ecf4',
    },
    readyIndicator: {
      position: 'absolute',
      height: 16,
      width: TIMELINE_ITEM_WIDTH - 1,
      pointerEvents: 'none',
      top: 0,
      backgroundColor: '#63B2BD',
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
