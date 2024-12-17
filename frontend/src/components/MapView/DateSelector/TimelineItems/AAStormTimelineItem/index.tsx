import { createStyles, makeStyles } from '@material-ui/core';
import React, { FC, memo, useMemo } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { DateItem, DateRangeType } from 'config/types';
import { datesAreEqualWithoutTime } from 'utils/date-utils';
import { parse, parseJSON } from 'date-fns';
import { getDateInUTC } from 'components/MapView/Layers/AnticipatoryActionStormLayer/utils';
import { useSelector } from 'react-redux';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { TIMELINE_ITEM_WIDTH } from '../../utils';
import dateJSON from '../../../../../../public/data/mozambique/anticipatory-action/date_temporary.json';
import { DateJSON, TimeAndState, WindState } from './types';

function AAStormTimelineItem({ currentDate }: AAStormTimelineItemProps) {
  const AAData = useSelector(AADataSelector);
  const classes = useStyles();

  const cycloneOfInterest = AAData.forecastDetails?.cyclone_name;

  const getCycloneIndicators = useMemo(() => {
    if (!cycloneOfInterest) {
      return [];
    }

    const date = Object.keys(dateJSON as DateJSON).find(analysedDate => {
      const analysedDateInUTC = getDateInUTC(analysedDate, false);
      if (!analysedDateInUTC) {
        return false;
      }

      return datesAreEqualWithoutTime(analysedDateInUTC, currentDate.value);
    });

    if (!date) {
      return [];
    }

    const foundCycloneName = Object.keys((dateJSON as DateJSON)[date])
      .map(i => i.toLowerCase())
      .find(cycloneName => cycloneName === cycloneOfInterest.toLowerCase());

    if (!foundCycloneName) {
      return [];
    }

    return (dateJSON as DateJSON)[date][foundCycloneName];
  }, [cycloneOfInterest, currentDate.value]);

  const getStylingClass = () => {
    if (getCycloneIndicators.length === 0) {
      return classes.emptySpace;
    }

    if (
      getCycloneIndicators.find(({ state }) => state === WindState.activated_64)
    ) {
      return classes.activated1Indicator;
    }

    if (
      getCycloneIndicators.find(
        ({ state }) => state === WindState.activated_118,
      )
    ) {
      return classes.activated2Indicator;
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
  //   concatenatedLayers: DateItem[][];
  currentDate: DateRangeType;
  //   dateItemStyling: {
  //     class: string;
  //     color: string;
  //     layerDirectionClass?: string;
  //     emphasis?: string;
  //   }[];
  //   isDateAvailable: boolean;
}
export default AAStormTimelineItem;
