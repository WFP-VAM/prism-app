import { Popup } from 'react-map-gl/maplibre';
import _React from 'react';
import { FeatureCollection, Point } from 'geojson';
import { getHours, getDate } from 'date-fns';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { getDateInUTC } from '../utils';

function AAStormDatePopup({ timeSeries }: PopupProps) {
  const classes = useStyles();

  function is6AM(time: string) {
    const dateInUTC = getDateInUTC(time);
    return getHours(dateInUTC) === 6;
  }

  function getDay(time: string) {
    const dateInUTC = getDateInUTC(time);
    return getDate(dateInUTC);
  }

  return (
    <>
      {timeSeries.features.map(timePoint => {
        const lng = timePoint.geometry.coordinates[0];
        const lat = timePoint.geometry.coordinates[1];

        const { time } = timePoint.properties;

        if (!is6AM(time)) {
          return null;
        }

        return (
          <Popup
            key={timePoint.id}
            longitude={lng}
            latitude={lat}
            anchor="top"
            offset={15}
            closeButton={false}
            onClose={() => null}
            closeOnClick={false}
            className={classes.popup}
          >
            <Typography className={classes.toolTipDate} variant="body1">
              {getDay(time)} - 6am{' '}
            </Typography>
          </Popup>
        );
      })}
    </>
  );
}

interface FeatureProperty {
  // data_type: string;
  time: string;
  development: string;
  // maximum_wind_speed: number;
  // maximum_wind_gust: number;
  // wind_buffer_48: any;
  // wind_buffer_64: any;
}

interface CustomPoint extends Point {}

export interface TimeSeries
  extends FeatureCollection<CustomPoint, FeatureProperty> {}

interface PopupProps {
  timeSeries: TimeSeries;
}

const useStyles = makeStyles(() =>
  createStyles({
    toolTipDate: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '14px',
    },
    popup: {
      '& > .maplibregl-popup-content': {
        border: '1px solid #A4A4A4',
        padding: 5,
      },
      '& > .maplibregl-popup-tip': {
        borderBottomColor: '#A4A4A4',
        borderLeftWidth: '8px',
        borderRightWidth: '8px',
      },
    },
  }),
);

export default AAStormDatePopup;
