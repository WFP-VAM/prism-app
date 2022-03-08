import {
  values,
  zipObject,
  assign,
  difference,
  mapValues,
  groupBy as _groupBy,
  keysIn,
  uniq,
} from 'lodash';
import { Map } from 'mapbox-gl';
import { LayerDefinitions } from '../../config/utils';
import { formatFeatureInfo } from '../../utils/server-utils';
import { getExtent } from './Layers/raster-utils';
import {
  WMSLayerProps,
  FeatureInfoType,
  FeatureInfoObject,
} from '../../config/types';
import { ExposedPopulationResult } from '../../utils/analysis-utils';
import { TableData } from '../../context/tableStateSlice';

export function getRoundedData(data: number, decimals: number = 3): string {
  return data
    ? parseFloat(data.toFixed(decimals))
        .toString()
        // add commas
        .replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
    : 'No Data';
}

export const getActiveFeatureInfoLayers = (map: Map): WMSLayerProps[] => {
  const matchStr = 'layer-';
  const layerIds =
    map
      .getStyle()
      .layers?.filter(l => l.id.startsWith(matchStr))
      .map(l => l.id.split(matchStr)[1]) ?? [];

  if (layerIds.length === 0) {
    return [];
  }

  const featureInfoLayers = Object.values(LayerDefinitions).filter(
    l => layerIds.includes(l.id) && l.type === 'wms' && l.featureInfoProps,
  );

  if (featureInfoLayers.length === 0) {
    return [];
  }

  return featureInfoLayers as WMSLayerProps[];
};

export const getFeatureInfoParams = (
  map: Map,
  evt: any,
  date: string,
): FeatureInfoType => {
  const { x, y } = evt.point;
  const bbox = getExtent(map);
  const { clientWidth, clientHeight } = map.getContainer();

  const params = {
    bbox,
    x: Math.floor(x),
    y: Math.floor(y),
    width: clientWidth,
    height: clientHeight,
    time: date,
  };

  return params;
};

export const convertToTableData = (result: ExposedPopulationResult) => {
  const {
    key,
    groupBy,
    statistic,
    featureCollection: { features },
  } = result;

  const fields = uniq(features.map(f => f.properties && f.properties[key]));

  const featureProperties = features.map(feature => {
    return {
      [groupBy]: feature.properties?.[groupBy],
      [key]: feature.properties?.[key],
      [statistic]: feature.properties?.[statistic],
    };
  });

  const rowData = mapValues(_groupBy(featureProperties, groupBy), k => {
    return mapValues(_groupBy(k, key), v =>
      parseInt(
        v.map(x => x[statistic]).reduce((acc, value) => acc + value),
        10,
      ),
    );
  });

  const groupedRowData = Object.keys(rowData).map(k => {
    return {
      [groupBy]: k,
      ...rowData[k],
    };
  });

  const groupedRowDataWithAllLabels = groupedRowData.map(row => {
    const labelsWithoutValue = difference(fields, keysIn(row));
    const extras = labelsWithoutValue.map(k => ({ [k]: 0 }));
    return extras.length !== 0 ? assign(row, ...extras) : row;
  });

  const headlessRows = groupedRowDataWithAllLabels.map(row => {
    const total = fields.map(f => row[f]).reduce((a, b) => a + b);
    return assign(row, { Total: total });
  });

  const columns = [groupBy, ...fields, 'Total'];
  const headRow = zipObject(columns, columns);
  const rows = [headRow, ...headlessRows];
  return { columns, rows };
};

export const exportDataTableToCSV = (data: TableData) => {
  const { rows } = data;
  return rows.map(r => values(r)).join('\n');
};

export const downloadToFile = (
  source: { content: string; isUrl: boolean },
  filename: string,
  contentType: string,
) => {
  const link = document.createElement('a');
  const fileType = contentType.split('/')[1];

  link.setAttribute(
    'href',
    source.isUrl
      ? source.content
      : URL.createObjectURL(new Blob([source.content], { type: contentType })),
  );
  link.setAttribute('download', `${filename}.${fileType}`);
  link.click();
};

export function getFeatureInfoPropsData(
  featureInfoProps: FeatureInfoObject,
  event: any,
) {
  const keys = Object.keys(featureInfoProps);
  const { properties } = event.features[0];
  const coordinates = event.lngLat;

  return Object.keys(properties)
    .filter(prop => keys.includes(prop))
    .reduce((obj, item) => {
      return {
        ...obj,
        [featureInfoProps[item].label]: {
          data: formatFeatureInfo(
            properties[item],
            featureInfoProps[item].type,
          ),
          coordinates,
        },
      };
    }, {});
}
