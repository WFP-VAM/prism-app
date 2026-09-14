import { Typography } from '@mui/material';
import {
  STORM_DATE_POPUP_CLASS,
  stormDateTooltipTextSx,
} from 'components/MapView/Layers/layerPopupStyles';
import {
  AAStormTimeSeriesFeature,
  FeaturePropertyDataType,
  TimeSeries,
} from 'prism-common/';
import _React, { useCallback, useState } from 'react';
import { MapLayerMouseEvent, Popup } from 'react-map-gl/maplibre';
import { useMapCallback } from 'utils/map-utils';

import { formatWindPointDate } from '../utils';

interface AAStormDatePopupProps {
  timeSeries?: TimeSeries;
}

function AAStormDatePopup({ timeSeries }: AAStormDatePopupProps) {
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
        className={STORM_DATE_POPUP_CLASS}
        longitude={lng}
        latitude={lat}
        anchor="top"
        offset={25}
        closeButton={false}
        onClose={() => null}
        closeOnClick={false}
      >
        <Typography sx={stormDateTooltipTextSx} variant="body1">
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

export default AAStormDatePopup;
