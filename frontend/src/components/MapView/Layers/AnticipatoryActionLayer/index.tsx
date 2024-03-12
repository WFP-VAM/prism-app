import React from 'react';
import { AnticipatoryActionLayerProps, BoundaryLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';
import { useSelector } from 'react-redux';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import {
  AACategoryFiltersSelector,
  AASelectedWindowSelector,
  AnticipatoryActionDataSelector,
  allWindowsKey,
} from 'context/anticipatoryActionStateSlice';
import { Layer, Source } from 'react-map-gl/maplibre';
import { getFormattedDate } from 'utils/date-utils';
import { DateFormat } from 'utils/name-utils';
import {
  AADataSeverityOrder,
  getAAColor,
} from 'components/MapView/LeftPanel/AnticipatoryActionPanel/utils';

const boundaryLayer = getBoundaryLayerSingleton();

function AnticipatoryActionLayer({ layer, before }: LayersProps) {
  const selectedDate = useDefaultDate(layer.id);
  const AAData = useSelector(AnticipatoryActionDataSelector);
  const aaWindow = useSelector(AASelectedWindowSelector);
  const aaCategories = useSelector(AACategoryFiltersSelector);
  const boundaryLayerState = useSelector(
    layerDataSelector(boundaryLayer.id),
  ) as LayerData<BoundaryLayerProps> | undefined;
  const { data } = boundaryLayerState || {};

  const date = getFormattedDate(selectedDate, DateFormat.Default);

  const districtsWithColors = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(AAData).map(([district, districtData]) => {
          const sameDateAndWindow = districtData.filter(
            x =>
              x.date === date &&
              (aaWindow === allWindowsKey || x.windows === aaWindow),
          );

          if (sameDateAndWindow.length === 0) {
            return [district, getAAColor('ny', 'ny', true)];
          }

          const active = sameDateAndWindow.filter(
            x =>
              x.probability !== 'NA' &&
              Number(x.probability) >= Number(x.trigger),
          );
          if (active.length === 0) {
            return [district, getAAColor('na', 'na', true)];
          }

          const max = active.reduce(
            (prev, curr) => {
              const currVal = AADataSeverityOrder(curr.category, curr.phase);
              return currVal > prev.val ? { val: currVal, data: curr } : prev;
            },
            { val: -1, data: active[0] },
          );

          if (aaCategories[max.data.category] === false) {
            return [district, null];
          }

          return [
            district,
            getAAColor(max.data.category, max.data.phase, true),
          ];
        }),
      ),
    [AAData, aaCategories, aaWindow, date],
  );

  const layers = Object.entries(districtsWithColors)
    .map(([district, color]) => {
      const features = [
        data?.features.find(
          cell =>
            cell.properties?.[boundaryLayer.adminLevelLocalNames[1]] ===
            district,
        ),
      ];
      return {
        id: `anticipatory-action-${district}`,
        data: { ...data, features },
        color,
      };
    })
    .filter(x => x.color !== null);

  return (
    <>
      {layers.map(l => (
        <Source id={l.id} type="geojson" data={l.data}>
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
              'line-width': 2,
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
