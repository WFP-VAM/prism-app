import { useMemo } from 'react';
import { AnticipatoryActionLayerProps, AnticipatoryAction } from 'config/types';
import { useAnticipatoryAction } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/useAnticipatoryAction';
import { Layer, Source } from 'react-map-gl/maplibre';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector, useDispatch } from 'react-redux';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { setAAFloodSelectedStation } from 'context/anticipatoryAction/AAFloodStateSlice';
import { useMapCallback, getLayerMapId } from 'utils/map-utils';
import { MapLayerMouseEvent } from 'maplibre-gl';
import { hidePopup } from 'context/tooltipStateSlice';

interface AnticipatoryActionFloodLayerProps {
  layer: AnticipatoryActionLayerProps;
}

function AnticipatoryActionFloodLayer({
  layer,
}: AnticipatoryActionFloodLayerProps) {
  // Load the layer default date if no date is selected
  useDefaultDate(layer.id);
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations } = AAData;
  const { startDate } = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  // Handle click events on flood stations
  const onFloodStationClick = () => (e: MapLayerMouseEvent) => {
    e.preventDefault();
    dispatch(hidePopup()); // Hide any existing popups

    const feature = e.features?.[0];
    if (feature?.properties?.station_name) {
      dispatch(setAAFloodSelectedStation(feature.properties.station_name));
    }
  };

  useMapCallback<'click', null>(
    'click',
    getLayerMapId(`${layer.id}-circles`),
    null,
    onFloodStationClick,
  );

  const selectedDateKey = startDate
    ? new Date(startDate).toISOString().split('T')[0]
    : null;

  const floodStationsGeoJSON = useMemo(() => {
    if (!stations.length) {
      return null;
    }

    // Filter stations by selected date if available
    const filteredStations = stations.filter((station: any) => {
      if (!selectedDateKey) {
        return true;
      }

      // Find data for the selected date
      const stationDataForDate = station.allData?.[selectedDateKey];

      return !!stationDataForDate;
    });

    return {
      type: 'FeatureCollection' as const,
      features: filteredStations.map((station: any) => {
        const stationData = selectedDateKey
          ? station.allData?.[selectedDateKey]
          : station.currentData;

        return {
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
            // TODO - avoid hardcoding defaults
            risk_level: stationData?.risk_level || 'Below bankfull',
            avg_discharge: stationData?.avg_discharge || 0,
            max_discharge: stationData?.max_discharge || 0,
            thresholds: station.thresholds,
          },
        };
      }),
    };
  }, [stations, selectedDateKey]);

  if (!floodStationsGeoJSON) {
    return null;
  }

  return (
    <Source
      id={`${layer.id}-source`}
      type="geojson"
      data={floodStationsGeoJSON}
    >
      <Layer
        id={getLayerMapId(`${layer.id}-circles`)}
        type="circle"
        paint={{
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
        }}
      />
      <Layer
        id={getLayerMapId(`${layer.id}-labels`)}
        type="symbol"
        layout={{
          'text-field': ['get', 'station_name'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-offset': [0, 2],
          'text-anchor': 'top',
        }}
        paint={{
          'text-color': '#000000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}

export default AnticipatoryActionFloodLayer;
