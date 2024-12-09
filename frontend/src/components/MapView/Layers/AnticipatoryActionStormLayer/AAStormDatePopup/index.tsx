import { MapLayerMouseEvent, Popup } from 'react-map-gl/maplibre';
import _React, { useCallback, useState } from 'react';
import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { useMapCallback } from 'utils/map-utils';
import { formatInUTC, getDateInUTC } from '../utils';
import { TimeSeriesFeature } from '../types';

function AAStormDatePopup() {
  const classes = useStyles();
  const [selectedFeature, setSelectedFeature] =
    useState<TimeSeriesFeature | null>(null);

  const onMouseEnter = useCallback(
    () => (evt: MapLayerMouseEvent) => {
      evt.preventDefault();
      setSelectedFeature(evt.features?.[0] as unknown as TimeSeriesFeature);
    },
    [],
  );

  const onMouseLeave = useCallback(
    () => (evt: MapLayerMouseEvent) => {
      evt.preventDefault();
      setSelectedFeature(null);
    },
    [],
  );

  useMapCallback<'mouseenter', null>(
    'mouseenter',
    'aa-storm-wind-points-layer',
    null,
    onMouseEnter,
  );

  useMapCallback<'mouseleave', null>(
    'mouseleave',
    'aa-storm-wind-points-layer',
    null,
    onMouseLeave,
  );

  function getDayAndTime(time: string) {
    const dateInUTC = getDateInUTC(time);

    if (!dateInUTC) {
      return '';
    }

    return formatInUTC(dateInUTC, 'dd - Kaaa');
  }

  if (!selectedFeature) {
    return null;
  }

  const lng = selectedFeature.geometry.coordinates[0];
  const lat = selectedFeature.geometry.coordinates[1];

  const { time } = selectedFeature.properties;

  return (
    <Popup
      key={selectedFeature.id}
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
        {getDayAndTime(time)}
      </Typography>
    </Popup>
  );
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
