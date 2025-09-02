import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapLayerMouseEvent } from 'maplibre-gl';
import { RootState } from 'context/store';
import { AnticipatoryActionLayerProps } from 'config/types';
import { loadAAFloodData } from 'context/anticipatoryAction/AAFloodStateSlice';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { useMapLayer } from 'components/MapView/Layers/layer-utils';

interface AnticipatoryActionFloodLayerProps {
  layer: AnticipatoryActionLayerProps;
}

function AnticipatoryActionFloodLayer({
  layer,
}: AnticipatoryActionFloodLayerProps) {
  const dispatch = useDispatch();
  const { stations, loading } = useSelector(
    (state: RootState) => state.anticipatoryActionFloodState,
  );

  useEffect(() => {
    if (!loading && stations.length === 0) {
      dispatch(loadAAFloodData());
    }
  }, [dispatch, loading, stations.length]);

  const floodStationsGeoJSON = useMemo(() => {
    if (!stations.length) return null;

    return {
      type: 'FeatureCollection' as const,
      features: stations.map(station => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: station.coordinates
            ? [station.coordinates.longitude, station.coordinates.latitude]
            : [0, 0], // Default coordinates if not available
        },
        properties: {
          station_name: station.station_name,
          river_name: station.river_name,
          location_id: station.location_id,
          risk_level: station.currentData?.risk_level || 'Below bankfull',
          avg_discharge: station.currentData?.avg_discharge || 0,
          max_discharge: station.currentData?.max_discharge || 0,
          thresholds: station.thresholds,
        },
      })),
    };
  }, [stations]);

  const handleClick = (evt: MapLayerMouseEvent) => {
    const feature = evt.features?.[0];
    if (feature) {
      // Handle station click - could open popup or update selected station
      console.log('Flood station clicked:', feature.properties);
    }
  };

  useMapLayer({
    layerId: layer.id,
    sourceId: `${layer.id}-source`,
    source: {
      type: 'geojson',
      data: floodStationsGeoJSON,
    },
    layers: [
      {
        id: `${layer.id}-circles`,
        type: 'circle',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'risk_level'], 'Severe'],
            12,
            ['==', ['get', 'risk_level'], 'Moderate'],
            10,
            ['==', ['get', 'risk_level'], 'Bankfull'],
            8,
            6,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'risk_level'], 'Severe'],
            '#F44336',
            ['==', ['get', 'risk_level'], 'Moderate'],
            '#FF9800',
            ['==', ['get', 'risk_level'], 'Bankfull'],
            '#FFC107',
            '#4CAF50',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      },
      {
        id: `${layer.id}-labels`,
        type: 'symbol',
        layout: {
          'text-field': ['get', 'station_name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-offset': [0, 2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#000000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      },
    ],
    onClick: handleClick,
  });

  return null;
}

export default AnticipatoryActionFloodLayer;
