import React, { useEffect } from 'react';
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
    (map as maplibregl.Map).loadImage(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAABDlBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAEAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAACAAACAAACAAACAAICAAICAAICAAACAAACAAICAAICAAACAAACAAACAAICAAACAAICAAACAAICAAACAAACAAICAAICAAICAAICAAICAAICAAIBAAEBAAEBAAEBAAEBAAEBAAEBAAEDAAEDAAEBAAEDAAEDAAEDAAEDAAEDAAH////+RBh8AAAAWXRSTlMAAQMEBQcICgsMDRMUFxscHR4fJygqLC0xMjQ1ODo7P0BBQkdQUVZXWFlcXWBhZWdoaW9wcXR1gYKDhIaRkpKTk5aXnJ2foaKpqqyvsLGztLe3uLm5u7y9vqQlt1oAAAABYktHRFmasvQYAAABU0lEQVRIx53Wh1LCUBQE0BWsETt2xYJYYi8EFQsqFowiBhL5/y/Rmzwy4yjDXT7gzO7doTz4O8B4+XESPRvNYyB1484AKzUniaGClwHm3ooW+k4aWWCqcj+ChA1bzFj5eUJtfhSbA2NGH57URtr524yBtNttbhEGktS7H2zqTdQuudfQ58RrExt0YbK0QbTC3bDeIGyXrlyn1MZclH65VXfD70+pyli0gbQ79RkDSeo/8whjVmByzEVUzn/f7g4mQxtI0ny1OKA3CNstVi8H1cZctPB+oe6Gtr9w7U2SNpB2594SYSBJVuFjWW/MCkyOuYjKQZyj3qDTv8lfA0larTsJvUHYbr2e1xtz0Votr+4Wr/3pcGaW2kDaldxpwiC86OqV2BrRCkxOazkiBy1TctVG2n3pXiLGIFrhiDAIL8oFB3pjVsgFh2rDvV66NuxrzPa/AZH9LT54BxTLAAAAAElFTkSuQmCC',
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
          throw err;
        }

        // Add the image to the map style.
        (map as maplibregl.Map).addImage('pattern', image);
      },
    );
  }, [dispatch, features, layer, queryDate, boundaryId, map]);

  if (!features) {
    return null;
  }

  if (!isLayerOnView(map, boundaryId)) {
    return null;
  }

  console.log(layer.type);

  return (
    <GeoJSONLayer
      before={`layer-${boundaryId}-line`}
      id={`layer-${layer.id}`}
      data={features}
      fillPaint={fillPaintData(layer, 'data', true)}
      fillOnClick={async (evt: any) => {
        addPopupParams(layer, dispatch, evt, t, true);
      }}
    />
  );
}

export default AdminLevelDataLayers;
