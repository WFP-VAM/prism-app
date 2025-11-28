import React from 'react';
import {
  AdminLevelDataLayerProps,
  AnticipatoryActionLayerProps,
  MapEventWrapFunctionProps,
} from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useDispatch, useSelector } from 'react-redux';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useBoundaryData } from 'utils/useBoundaryData';
import {
  Layer,
  MapLayerMouseEvent,
  Marker,
  Source,
} from 'react-map-gl/maplibre';
import {
  AAFiltersSelector,
  AAMarkersSelector,
  AARenderedDistrictsSelector,
  AASelectedDistrictSelector,
  setAAMarkers,
  setAASelectedDistrict,
  setAAView,
} from 'context/anticipatoryAction/AADroughtStateSlice';
import { getAAColor } from 'components/MapView/LeftPanel/AnticipatoryActionPanel/AnticipatoryActionDroughtPanel/utils';
import {
  calculateCentroids,
  useAAMarkerScalePercent,
  useMapCallback,
} from 'utils/map-utils';
import { getBoundaryLayersByAdminLevel } from 'config/utils';
import {
  calculateAAMarkers,
  calculateCombinedAAMapData,
} from 'context/anticipatoryAction/AADroughtStateSlice/utils';
import { AAView } from 'context/anticipatoryAction/AADroughtStateSlice/types';
import { Tooltip } from '@mui/material';

// Use admin level 2 boundary layer for Anticipatory Action
const boundaryLayer = getBoundaryLayersByAdminLevel(2);

const onDistrictClick =
  ({ dispatch }: MapEventWrapFunctionProps<AdminLevelDataLayerProps>) =>
  (evt: MapLayerMouseEvent) => {
    const districtId =
      evt.features?.[0]?.properties?.[boundaryLayer.adminLevelLocalNames[1]];
    if (districtId) {
      dispatch(setAASelectedDistrict(districtId));
      dispatch(setAAView(AAView.District));
    }
  };

const AnticipatoryActionDroughtLayer = React.memo(
  ({ layer, before }: LayersProps) => {
    useDefaultDate(layer.id);
    const map = useSelector(mapSelector);
    const { data } = useBoundaryData(boundaryLayer.id, map);
    const dispatch = useDispatch();
    const renderedDistricts = useSelector(AARenderedDistrictsSelector);
    const { selectedWindow } = useSelector(AAFiltersSelector);
    const selectedDistrict = useSelector(AASelectedDistrictSelector);
    const markers = useSelector(AAMarkersSelector);

    useMapCallback(
      'click',
      `anticipatory-action-fill`,
      layer as any,
      onDistrictClick,
    );

    const shouldRenderData = React.useMemo(() => {
      if (selectedWindow === 'All') {
        return calculateCombinedAAMapData(renderedDistricts);
      }
      if (selectedWindow) {
        return Object.fromEntries(
          Object.entries(renderedDistricts[selectedWindow]).map(
            ([dist, values]) => [dist, values[0]],
          ),
        );
      }
      return {};
    }, [renderedDistricts, selectedWindow]);

    // Calculate centroids only once per data change
    React.useEffect(() => {
      const districtCentroids = calculateCentroids(data);
      const m = calculateAAMarkers({
        renderedDistricts,
        selectedWindow,
        districtCentroids,
      });
      dispatch(setAAMarkers(m));
    }, [data, dispatch, renderedDistricts, selectedWindow]);

    const highlightDistrictLine = React.useMemo(
      () => ({
        ...data,
        features: [
          data?.features.find(
            f =>
              f.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
              selectedDistrict,
          ),
        ].filter(x => x),
      }),
      [data, selectedDistrict],
    );

    const coloredDistrictsLayer = React.useMemo(() => {
      const districtEntries = Object.entries(shouldRenderData);
      if (!data || !districtEntries.length) {
        return null;
      }
      return {
        ...data,
        features: Object.entries(shouldRenderData)
          .map(([districtId, { category, phase }]: [string, any]) => {
            const feature = data?.features.find(
              f =>
                f.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
                districtId,
            );

            if (!feature) {
              return null;
            }
            const color = getAAColor(category, phase, true);
            return {
              ...feature,
              properties: {
                ...feature.properties,
                fillColor: color || 'grey',
              },
            };
          })
          .filter(f => f !== null),
      };
    }, [data, shouldRenderData]);

    const scalePercent = useAAMarkerScalePercent(map);

    const mainLayerBefore = selectedDistrict
      ? 'anticipatory-action-selected-line'
      : before;

    return (
      <>
        {markers.map(marker => (
          <Marker
            key={`marker-${marker.district}`}
            longitude={marker.longitude}
            latitude={marker.latitude}
            anchor="center"
          >
            <Tooltip title={marker.district} arrow>
              <div
                style={{
                  transform: `scale(${scalePercent})`,
                  cursor: 'pointer',
                }}
              >
                {marker.icon}
              </div>
            </Tooltip>
          </Marker>
        ))}
        <Source
          id="anticipatory-action-selected"
          type="geojson"
          data={highlightDistrictLine}
        >
          <Layer
            beforeId={before}
            id="anticipatory-action-selected-line"
            type="line"
            source="anticipatory-action-selected"
            paint={{
              'line-color': 'red',
              'line-width': 4,
              'line-opacity': highlightDistrictLine.features.length > 0 ? 1 : 0,
            }}
          />
        </Source>
        {coloredDistrictsLayer && (
          <Source
            key="anticipatory-action"
            id="anticipatory-action-"
            type="geojson"
            data={coloredDistrictsLayer}
          >
            <Layer
              beforeId={mainLayerBefore}
              type="fill"
              id="anticipatory-action-fill"
              source="anticipatory-action"
              layout={{}}
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': 0.9,
              }}
            />
            <Layer
              beforeId={mainLayerBefore}
              id="anticipatory-action-boundary"
              type="line"
              source="anticipatory-action"
              paint={{
                'line-color': 'black',
              }}
            />
          </Source>
        )}
      </>
    );
  },
);
export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default AnticipatoryActionDroughtLayer;
