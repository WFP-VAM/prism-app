import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { GeoJSONLayer } from 'react-mapbox-gl';
import {
  AdminLevelDataLayerProps,
  BoundaryLayerProps,
  LayerKey,
} from '../../../../config/types';
import {
  LayerData,
  loadLayerData,
} from '../../../../context/layers/layer-data';
import {
  layerDataSelector,
  mapSelector,
} from '../../../../context/mapStateSlice/selectors';
import { addLayer, removeLayer } from '../../../../context/mapStateSlice';
import { useDefaultDate } from '../../../../utils/useDefaultDate';
import { getBoundaryLayers, LayerDefinitions } from '../../../../config/utils';
import { addNotification } from '../../../../context/notificationStateSlice';
import {
  firstBoundaryOnView,
  isLayerOnView,
} from '../../../../utils/map-utils';
import { useSafeTranslation } from '../../../../i18n';
import { fillPaintData } from '../styles';
import { availableDatesSelector } from '../../../../context/serverStateSlice';
import { getRequestDate } from '../../../../utils/server-utils';
import { addPopupParams } from '../layer-utils';
import { convertSvgToPngBase64Image } from '../../../../utils/image-utils';

function AdminLevelDataLayers({ layer }: { layer: AdminLevelDataLayerProps }) {
  const dispatch = useDispatch();
  const map = useSelector(mapSelector);
  const serverAvailableDates = useSelector(availableDatesSelector);

  const boundaryId = layer.boundary || firstBoundaryOnView(map);

  const selectedDate = useDefaultDate(layer.id);
  const layerAvailableDates = serverAvailableDates[layer.id];
  const queryDate = getRequestDate(layerAvailableDates, selectedDate);

  const layerData = useSelector(layerDataSelector(layer.id, queryDate)) as
    | LayerData<AdminLevelDataLayerProps>
    | undefined;
  const { data } = layerData || {};
  const { features } = data || {};
  const { t } = useSafeTranslation();

  const addFillPatternImageInMap = useCallback(async () => {
    if (!map || !layer.fillPattern) {
      return;
    }
    const convertedImage = await convertSvgToPngBase64Image(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="50" height="50"><defs><style>.cls-1,.cls-3{fill:none;}.cls-2{clip-path:url(#clip-path);}.cls-3{stroke:red;stroke-miterlimit:10;stroke-width:2px;}.cls-4{fill:url(#_19-2_black_diagonal);}</style><clipPath id="clip-path"><rect id="SVGID" class="cls-1" width="100" height="100"/></clipPath><pattern id="_19-2_black_diagonal" data-name="19-2 black diagonal" width="100" height="100" patternTransform="translate(-86.59 -30.89)" patternUnits="userSpaceOnUse" viewBox="0 0 100 100"><rect class="cls-1" width="100" height="100"/><g class="cls-2"><line class="cls-3" x1="153.03" y1="53.03" x2="46.97" y2="-53.03"/><line class="cls-3" x1="147.48" y1="58.59" x2="41.41" y2="-47.48"/><line class="cls-3" x1="141.92" y1="64.14" x2="35.86" y2="-41.92"/><line class="cls-3" x1="136.37" y1="69.7" x2="30.3" y2="-36.37"/><line class="cls-3" x1="130.81" y1="75.26" x2="24.74" y2="-30.81"/><line class="cls-3" x1="125.26" y1="80.81" x2="19.19" y2="-25.26"/><line class="cls-3" x1="119.7" y1="86.37" x2="13.63" y2="-19.7"/><line class="cls-3" x1="114.14" y1="91.92" x2="8.08" y2="-14.14"/><line class="cls-3" x1="108.59" y1="97.48" x2="2.52" y2="-8.59"/><line class="cls-3" x1="103.03" y1="103.03" x2="-3.03" y2="-3.03"/><line class="cls-3" x1="97.48" y1="108.59" x2="-8.59" y2="2.52"/><line class="cls-3" x1="91.92" y1="114.14" x2="-14.14" y2="8.08"/><line class="cls-3" x1="86.37" y1="119.7" x2="-19.7" y2="13.63"/><line class="cls-3" x1="80.81" y1="125.26" x2="-25.26" y2="19.19"/><line class="cls-3" x1="75.26" y1="130.81" x2="-30.81" y2="24.74"/><line class="cls-3" x1="69.7" y1="136.37" x2="-36.37" y2="30.3"/><line class="cls-3" x1="64.14" y1="141.92" x2="-41.92" y2="35.86"/><line class="cls-3" x1="58.59" y1="147.48" x2="-47.48" y2="41.41"/><line class="cls-3" x1="53.03" y1="153.03" x2="-53.03" y2="46.97"/></g></pattern></defs><title>Asset 8</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><rect class="cls-4" width="100" height="100"/></g></g></svg>',
    );
    map.loadImage(
      convertedImage,
      (
        err: any,
        image:
          | HTMLImageElement
          | ArrayBufferView
          | {
              width: number;
              height: number;
              data: Uint8Array | Uint8ClampedArray;
            }
          | ImageData
          | ImageBitmap,
      ) => {
        // Throw an error if something goes wrong.
        if (err) {
          map.removeImage(`pattern-${layer.id}`);
          throw err;
        }

        // Add the image to the map style.
        map.addImage(`pattern-${layer.id}`, image);
      },
    );
  }, [layer.fillPattern, layer.id, map]);

  useEffect(() => {
    addFillPatternImageInMap();
  }, [addFillPatternImageInMap]);

  useEffect(() => {
    // before loading layer check if it has unique boundary?
    const boundaryLayers = getBoundaryLayers();
    const boundaryLayer = LayerDefinitions[
      boundaryId as LayerKey
    ] as BoundaryLayerProps;

    if ('boundary' in layer) {
      if (Object.keys(LayerDefinitions).includes(boundaryId)) {
        boundaryLayers.map(l => dispatch(removeLayer(l)));
        dispatch(addLayer({ ...boundaryLayer, isPrimary: true }));

        // load unique boundary only once
        // to avoid double loading which proven to be performance issue
        if (!isLayerOnView(map, boundaryId)) {
          dispatch(loadLayerData({ layer: boundaryLayer }));
        }
      } else {
        dispatch(
          addNotification({
            message: `Invalid unique boundary: ${boundaryId} for ${layer.id}`,
            type: 'error',
          }),
        );
      }
    }
    if (!features) {
      dispatch(loadLayerData({ layer, date: queryDate }));
    }
  }, [boundaryId, dispatch, features, layer, map, queryDate]);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }

  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={features}
      fillPaint={fillPaintData(layer, 'data', layer?.fillPattern ?? false)}
      fillOnClick={async (evt: any) => {
        addPopupParams(layer, dispatch, evt, t, true);
      }}
    />
  );
}

export default AdminLevelDataLayers;
