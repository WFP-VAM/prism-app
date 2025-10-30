import { createStyles, makeStyles } from '@material-ui/core';

import 'react-datepicker/dist/react-datepicker.css';
import { DateRangeType } from 'config/types';
import { WindState } from 'prism-common';
import { AAStormColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionStormPanel/utils';
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

const createTimelineItemBaseStyles = () => ({
  position: 'absolute' as const,
  pointerEvents: 'none' as const,
  width: TIMELINE_ITEM_WIDTH - 1,
  top: 0,
});

const useStyles = makeStyles(() =>
  createStyles({
    emptySpace: {
      ...createTimelineItemBaseStyles(),
      height: 10,
    },
    lowRiskIndicator: {
      ...createTimelineItemBaseStyles(),
      height: 12,
      backgroundColor: '#b5ecf4',
    },
    readyIndicator: {
      ...createTimelineItemBaseStyles(),
      height: 16,
      backgroundColor: '#63B2BD',
    },
    activated1Indicator: {
      ...createTimelineItemBaseStyles(),
      height: 20,
      backgroundColor: AAStormColors.categories.moderate.background,
    },
    activated2Indicator: {
      ...createTimelineItemBaseStyles(),
      height: 24,
      backgroundColor: AAStormColors.categories.severe.background,
    },
  }),
);
interface AAStormTimelineItemProps {
  currentDate: DateRangeType;
}
export default AAStormTimelineItem;
