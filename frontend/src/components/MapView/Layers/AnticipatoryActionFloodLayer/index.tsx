import { useMemo } from 'react';
import { AnticipatoryActionLayerProps, AnticipatoryAction } from 'config/types';
import { useAnticipatoryAction } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/useAnticipatoryAction';
import { Layer, Source, Marker } from 'react-map-gl/maplibre';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector, useDispatch } from 'react-redux';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { setAAFloodSelectedStation } from 'context/anticipatoryAction/AAFloodStateSlice';
import { hidePopup } from 'context/tooltipStateSlice';
import { Tooltip } from '@material-ui/core';
import { AAFloodColors } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionFloodPanel/constants';

interface AnticipatoryActionFloodLayerProps {
  layer: AnticipatoryActionLayerProps;
}

const getCircleColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'Severe':
      return AAFloodColors.riskLevels.severe;
    case 'Moderate':
      return AAFloodColors.riskLevels.moderate;
    case 'Bankfull':
      return AAFloodColors.riskLevels.bankfull;
    default:
      return AAFloodColors.riskLevels.notExceeded;
  }
};

const getBorderColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'Severe':
      return AAFloodColors.borderColors.severe;
    case 'Moderate':
      return AAFloodColors.borderColors.moderate;
    case 'Bankfull':
      return AAFloodColors.borderColors.bankfull;
    default:
      return AAFloodColors.borderColors.notExceeded;
  }
};

const CIRCLE_SIZE = 16;

function AnticipatoryActionFloodLayer({
  layer,
}: AnticipatoryActionFloodLayerProps) {
  // Load the layer default date if no date is selected
  useDefaultDate(layer.id);
  const { AAData } = useAnticipatoryAction(AnticipatoryAction.flood);
  const { stations, stationSummaryData } = AAData;
  const { startDate } = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  const handleFloodStationEvent = (stationName?: string) => {
    dispatch(hidePopup()); // Hide any existing popups
    if (stationName) {
      dispatch(setAAFloodSelectedStation(stationName));
    }
  };

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
      const avg = stationSummaryData?.[station.station_name];
      const issueDate = avg?.forecast_issue_date
        ? new Date(avg.forecast_issue_date).toISOString().split('T')[0]
        : null;
      return issueDate === selectedDateKey;
    });

    return {
      type: 'FeatureCollection' as const,
      features: filteredStations
        .filter(
          (station: any) =>
            station.coordinates &&
            typeof station.coordinates.longitude === 'number' &&
            typeof station.coordinates.latitude === 'number',
        )
        .map((station: any) => {
          const avg = stationSummaryData?.[station.station_name];
          if (!avg) {
            return null;
          }
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [
                station.coordinates.longitude,
                station.coordinates.latitude,
              ],
            },
            properties: {
              station_name: station.station_name,
              river_name: station.river_name,
              station_id: station.station_id,
              risk_level: avg.trigger_status || 'Not exceeded',
              avg_discharge: 0,
              max_discharge: 0,
            },
          };
        }),
    };
  }, [stations, selectedDateKey, stationSummaryData]);

  if (!floodStationsGeoJSON) {
    return null;
  }

  const filteredStations = stations.filter((station: any) => {
    if (!selectedDateKey) {
      return true;
    }
    const avg = stationSummaryData?.[station.station_name];
    const issueDate = avg?.forecast_issue_date
      ? new Date(avg.forecast_issue_date).toISOString().split('T')[0]
      : null;
    return issueDate === selectedDateKey;
  });

  return (
    <>
      {filteredStations.map(station => {
        if (!station.coordinates) {
          return null;
        }
        const avg = stationSummaryData?.[station.station_name];
        if (!avg) {
          return null;
        }
        const riskLevel = avg.trigger_status || 'Not exceeded';
        const circleColor = getCircleColor(riskLevel);
        const borderColor = getBorderColor(riskLevel);

        return (
          <Marker
            key={`flood-station-${station.station_id}`}
            longitude={station.coordinates.longitude}
            latitude={station.coordinates.latitude}
            anchor="center"
          >
            <Tooltip title={station.station_name} arrow>
              <button
                style={{
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  boxSizing: 'content-box',
                  padding: 0,
                  borderRadius: '50%',
                  backgroundColor: circleColor,
                  border: `2px solid ${borderColor}`,
                  cursor: 'pointer',
                }}
                type="button"
                aria-label={`${station.station_name} flood station - ${riskLevel} risk level`}
                onClick={event => {
                  event.stopPropagation();
                  event.preventDefault();
                  handleFloodStationEvent(station.station_name);
                }}
              />
            </Tooltip>
          </Marker>
        );
      })}
      <Source
        id={`${layer.id}-source`}
        type="geojson"
        data={floodStationsGeoJSON}
      >
        <Layer
          id={`${layer.id}-labels`}
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
    </>
  );
}

export default AnticipatoryActionFloodLayer;
