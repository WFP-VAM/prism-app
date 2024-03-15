import React, { useEffect, useMemo, useState } from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from 'config/utils';
import {
  layerDataSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import maxInscribedCircle from 'max-inscribed-circle'; // ts-ignore
import simplify from '@turf/simplify';
import {
  AACategoryFiltersSelector,
  AASelectedDateDateSelector,
  AASelectedWindowSelector,
} from 'context/anticipatoryActionStateSlice';
import {
  AADataSeverityOrder,
  getAAColor,
  getAAIcon,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';

const boundaryLayer = getBoundaryLayerSingleton();

const districtCentroidOverride: { [key: string]: [number, number] } = {
  Chicualacuala: [31.6516, -22.7564],
  Changara: [33.1501, -16.66],
};

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  useDefaultDate(layer.id);
  const aaWindow = useSelector(AASelectedWindowSelector);
  const aaCategories = useSelector(AACategoryFiltersSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const map = useSelector(mapSelector);
  const selectedDateData = useSelector(AASelectedDateDateSelector);

  // Calculate centroids only once per data change
  const districtCentroids = useMemo(() => {
    const centroids: { [key: string]: any } = {};
    /* eslint-disable fp/no-mutation */
    // eslint-disable-next-line no-unused-expressions
    data?.features.forEach(feature => {
      const districtName =
        feature.properties?.[boundaryLayer.adminLevelLocalNames[1]];
      if (districtName) {
        if (districtName in districtCentroidOverride) {
          centroids[districtName] = {
            geometry: {
              coordinates: districtCentroidOverride[districtName],
            },
          };
        } else {
          // maxInscribedCircle requires a Polygon
          let mutableFeature: any = {
            geometry: { type: undefined, coordinates: undefined },
          };
          if (
            feature.geometry.type === 'MultiPolygon' &&
            feature.geometry.coordinates[0].length === 1
          ) {
            mutableFeature.geometry.type = 'Polygon';
            // eslint-disable-next-line prefer-destructuring
            mutableFeature.geometry.coordinates =
              feature.geometry.coordinates[0];
            mutableFeature.properties = feature.properties;
            mutableFeature.type = feature.type;
          } else {
            mutableFeature = feature;
          }

          try {
            const simplifiedFeature = simplify(mutableFeature, {
              tolerance: 0.01,
            });
            const centroid = maxInscribedCircle(simplifiedFeature);
            centroids[districtName] = centroid;
          } catch (e) {
            console.error(e);
            console.error('Error calculating centroid for', districtName);
          }
        }
      }
    });
    return centroids;
    /* eslint-enable */
  }, [data]);

  const districtsWithColorsAndIcons = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectedDateData).map(([district, districtData]) => {
          // TODO: we may need different sorting
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
              return [
                district,
                {
                  color: getAAColor('ny', 'ny', true),
                  icon: getAAIcon('ny', 'ny', true),
                },
              ];
            }
            return [district, { color: null, icon: null }];
          }
          return [
            district,
            {
              color: getAAColor(maxValid.category, maxValid.phase, true),
              icon: getAAIcon(maxValid.category, maxValid.phase, true),
            },
          ];
        }),
      ),
    [aaCategories, aaWindow, layer.csvWindowKey, selectedDateData],
  );

  const layers = Object.entries(districtsWithColorsAndIcons)
    .map(([district, colorAndIcons]: [string, any]) => {
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
        color: colorAndIcons.color,
        icon: colorAndIcons.icon,
        centroid,
      };
    })
    .filter(x => x.color !== null);

  const markers = useMemo(() => {
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

  const [scalePercent, setScalePercent] = useState(1);

  useEffect(() => {
    if (!map) {
      return () => {};
    }
    const updateScale = () => {
      if (!map) {
        // Return an empty cleanup function to keep the return type consistent
        return undefined;
      }

      // Get the center of the map to calculate the scale at this point
      const center = map.getCenter();

      // Convert the distance in meters to pixels for the current zoom level
      const pixelsPerMeter =
        map.project([center.lng + 0.1, center.lat]).x -
        map.project([center.lng, center.lat]).x;

      // Desired size ratio defining the final size of the object on the map.
      const sizeRatio = 6.5;
      const desiredWidthInPixels = sizeRatio * pixelsPerMeter;

      // Calculate the scale factor needed to adjust the marker to the desired width in pixels
      // Assuming the original width of the marker image is known
      const originalMarkerWidthInPixels = 40; // Adjust this value to the actual width of your marker image
      const scale = desiredWidthInPixels / originalMarkerWidthInPixels;

      setScalePercent(scale);
      // Explicitly return undefined to clarify that no value is intended to be returned
      return undefined;
    };

    // Listen for zoom changes
    map.on('zoom', updateScale);

    // Initial scale update
    updateScale();

    // Cleanup
    return () => {
      map.off('zoom', updateScale);
    };
  }, [map]);

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
