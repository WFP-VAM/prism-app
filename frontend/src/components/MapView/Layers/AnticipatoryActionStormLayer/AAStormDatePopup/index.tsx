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
      offset={25}
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
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        background: 'white',
        boxShadow: 'inset 0px 0px 0px 1px #A4A4A4',
        position: 'relative',
      },
      '& > .maplibregl-popup-tip': {
        display: 'none',
      },
      // hack to display the popup tip without overlapping border
      '&::after': {
        content: '""',
        position: 'absolute',
        left: '50%',
        top: -6,
        width: '12px',
        height: '12px',
        background: 'white',
        transform: 'translateX(-50%) rotate(45deg)',
        boxShadow: 'inset 1px 1px 0px 0px #A4A4A4',
      },
    },
  }),
);

export default AAStormDatePopup;
