import React from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useDispatch, useSelector } from 'react-redux';
import {
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import {
  AACategoryFiltersSelector,
  AARenderedDistrictsSelector,
  AASelectedDateDateSelector,
  AASelectedWindowSelector,
  setRenderedDistricts,
} from 'context/anticipatoryActionStateSlice';
import {
  AADataSeverityOrder,
  getAAColor,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';
import { calculateCentroids, useAAMarkerScalePercent } from 'utils/map-utils';
import { getBoundaryLayerSingleton } from 'config/utils';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  useDefaultDate(layer.id);
  const dispatch = useDispatch();
  const aaWindow = useSelector(AASelectedWindowSelector);
  const aaCategories = useSelector(AACategoryFiltersSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);
  const selectedDateData = useSelector(AASelectedDateDateSelector);
  const renderedDistricts = useSelector(AARenderedDistrictsSelector);

  // Calculate centroids only once per data change
  const districtCentroids = React.useMemo(() => calculateCentroids(data), [
    data,
  ]);

  React.useEffect(() => {
    const newRendered = Object.fromEntries(
      Object.entries(selectedDateData)
        .map(([district, districtData]) => {
          // eslint-disable-next-line fp/no-mutating-methods
          const sortedData = [...districtData].sort((a, b) => {
            const aOrder = AADataSeverityOrder(a.category, a.phase);
            const bOrder = AADataSeverityOrder(b.category, b.phase);

            if (aOrder > bOrder) {
              return -1;
            }
            if (aOrder < bOrder) {
              return 1;
            }
            return 0;
          });

          const filtered = sortedData.filter(x => aaCategories[x.category]);

          // let the first window layer to render empty district
          if (filtered.length === 0 && layer.csvWindowKey === 'Window 1') {
            return [district, { category: 'ny', phase: 'ny' }];
          }

          const maxValid = filtered.find((x, i) => {
            if (aaWindow !== layer.csvWindowKey && aaWindow !== 'All') {
              return false;
            }
            if (aaWindow === layer.csvWindowKey) {
              return x.windows === layer.csvWindowKey;
            }
            return x.windows === layer.csvWindowKey && i === 0;
          });

          if (!maxValid) {
            if (aaWindow === layer.csvWindowKey) {
              return [district, { category: 'ny', phase: 'ny' }];
            }
            return [district, undefined];
          }
          return [
            district,
            {
              category: maxValid.category,
              phase: maxValid.phase,
            },
          ];
        })
        .filter(x => x[1] !== undefined),
    );

    dispatch(
      setRenderedDistricts({
        data: newRendered,
        windowKey: layer.csvWindowKey,
      }),
    );
  }, [aaCategories, aaWindow, dispatch, layer.csvWindowKey, selectedDateData]);

  const layers = Object.entries(renderedDistricts[layer.csvWindowKey])
    .map(([district, { category, phase }]: [string, any]) => {
      const color = getAAColor(category, phase, true);
      const icon = getAAIcon(category, phase, true);
      const features = [
        data?.features.find(
          cell =>
            cell.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
            district,
        ),
      ];
      const centroid = districtCentroids[district] || {
        geometry: { coordinates: [0, 0] },
      };

      return {
        id: `anticipatory-action-${district}`,
        district,
        data: { ...data, features },
        color,
        icon,
        centroid,
      };
    })
    .filter(x => x.color !== null);

  const markers = React.useMemo(() => {
    if (!layers || layers.length === 0) {
      return [];
    }
    return layers.map(tempLayer => {
      return {
        district: tempLayer.district,
        longitude: tempLayer.centroid?.geometry.coordinates[0],
        latitude: tempLayer.centroid?.geometry.coordinates[1],
        icon: tempLayer.icon,
        centroid: tempLayer.centroid,
      };
    });
  }, [layers]);

  const scalePercent = useAAMarkerScalePercent(map);

  return (
    <>
      {markers.map(marker => (
        <Marker
          key={`marker-${marker.district}`}
          longitude={marker.longitude}
          latitude={marker.latitude}
          anchor="center"
        >
          <div style={{ transform: `scale(${scalePercent})` }}>
            {marker.icon}
          </div>
        </Marker>
      ))}
      {layers.map(l => (
        <Source key={l.id} id={l.id} type="geojson" data={l.data}>
          <Layer
            beforeId={before}
            type="fill"
            id={l.id}
            source={l.id}
            layout={{}}
            paint={{
              'fill-color': l.color as string,
              'fill-opacity': 0.9,
            }}
          />
          <Layer
            beforeId={before}
            id={`${l.id}-boundary`}
            type="line"
            source={l.id}
            paint={{
              'line-color': 'black',
            }}
          />
        </Source>
      ))}
    </>
  );
}

export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default React.memo(AnticipatoryActionLayer);
