import React from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { AnticipatoryActionDataSelector } from 'context/anticipatoryActionStateSlice';
import { Layer, Source } from 'react-map-gl/maplibre';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';

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

  const date = getFormattedDate(selectedDate, DateFormat.Default);

  const adminToDraw = Object.entries(AAData[layer.csvWindowKey] || {})
    .filter(x => x[1].find(y => y.date === date))
    .map(x => x[0]);
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
        beforeId={before}
        id="anticipatory-action"
        type="fill"
        source="anticipatory-action"
        layout={{}}
        paint={{
          'fill-color': '#f1f1f1',
          'fill-opacity': 0.9,
        }}
      />
      <Layer
        beforeId={before}
        id="anticipatory-action-boundary"
        type="line"
        source="anticipatory-action"
        paint={{
          'line-color': 'black',
          'line-width': 2,
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
