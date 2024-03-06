import React from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { AnticipatoryActionDataSelector } from 'context/anticipatoryActionStateSlice';
import { useUrlHistory } from 'utils/url-utils';
import { Layer, Source } from 'react-map-gl/maplibre';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  // TODO: selectedDate instead of URL
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedDate = useDefaultDate(layer.id);
  const AAData = useSelector(AnticipatoryActionDataSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};
  const { urlParams } = useUrlHistory();

  const urlDate = React.useMemo(() => {
    return urlParams.get('date');
  }, [urlParams]);

  const adminToDraw = AAData.filter(x => x.date === urlDate).map(
    x => x.district,
  );
  const filteredData = data && {
    ...data,
    features: data.features.filter(cell =>
      adminToDraw.includes(
        cell.properties?.[boundaryLayer.adminLevelLocalNames[1] as string],
      ),
    ),
  };

  return (
    <Source id="anticipatory-action" type="geojson" data={filteredData}>
      <Layer
        id="anticipatory-action"
        type="fill"
        source="anticipatory-action"
        layout={{}}
        paint={{
          'fill-color': '#f1f1f1',
          'fill-opacity': 0.9,
        }}
      />
    </Source>
  );
}

export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
  before?: string;
}

export default React.memo(AnticipatoryActionLayer);
