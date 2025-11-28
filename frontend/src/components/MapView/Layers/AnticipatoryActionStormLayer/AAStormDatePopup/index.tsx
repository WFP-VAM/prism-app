import { MapLayerMouseEvent, Popup } from 'react-map-gl/maplibre';
import { makeStyles, createStyles } from '@mui/styles';
import _React, { useCallback, useState } from 'react';
import { Typography } from '@mui/material';
import { useMapCallback } from 'utils/map-utils';
import {
  AAStormTimeSeriesFeature,
  FeaturePropertyDataType,
  TimeSeries,
} from 'prism-common/';
import { formatWindPointDate } from '../utils';

interface AAStormDatePopupProps {
  timeSeries?: TimeSeries;
}

function AAStormDatePopup({ timeSeries }: AAStormDatePopupProps) {
  const classes = useStyles();
  const [selectedFeature, setSelectedFeature] =
    useState<AAStormTimeSeriesFeature | null>(null);

  const onMouseEnter = useCallback(
    () => (evt: MapLayerMouseEvent) => {
      evt.preventDefault();
      setSelectedFeature(
        evt.features?.[0] as unknown as AAStormTimeSeriesFeature,
      );
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

  const firstForecastPoint: AAStormTimeSeriesFeature | undefined =
    // eslint-disable-next-line fp/no-mutating-methods
    timeSeries?.features
      .slice()
      .find(
        feature =>
          feature.properties.data_type === FeaturePropertyDataType.forecast,
      );

  function renderPopup(feature?: AAStormTimeSeriesFeature | null) {
    if (!feature) {
      return null;
    }

    const [lng, lat] = feature.geometry.coordinates;

    const { time } = feature.properties;

    return (
      <Popup
        key={feature.id}
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
          {formatWindPointDate(time)}
        </Typography>
      </Popup>
    );
  }

  function renderHoveredPopup() {
    // Don't show hover popup if there's no selection or if hovering the last analyzed point
    // (last analyzed point already has a permanent popup)
    if (!selectedFeature || selectedFeature.id === firstForecastPoint?.id) {
      return null;
    }

    return renderPopup(selectedFeature);
  }

  return (
    <>
      {/* Permanently render the popup for the last analyzed point */}
      {renderPopup(firstForecastPoint)}

      {renderHoveredPopup()}
    </>
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
        padding: '4px',
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
        top: -5,
        width: '10px',
        height: '10px',
        background: 'white',
        transform: 'translateX(-50%) rotate(45deg)',
        boxShadow: 'inset 1px 1px 0px 0px #A4A4A4',
      },
    },
  }),
);

export default AAStormDatePopup;
