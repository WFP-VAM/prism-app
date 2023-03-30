import { values } from 'lodash';
import { Map } from 'mapbox-gl';
import { LayerDefinitions } from '../../config/utils';
import { formatFeatureInfo } from '../../utils/server-utils';
import { getExtent } from './Layers/raster-utils';
import {
  FeatureInfoObject,
  FeatureInfoType,
  LegendDefinitionItem,
  WMSLayerProps,
} from '../../config/types';
import { TableData } from '../../context/tableStateSlice';

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
        [featureInfoProps[item].dataTitle]: {
          data: formatFeatureInfo(
            properties[item],
            featureInfoProps[item].type,
            featureInfoProps[item].labelMap,
          ),
          coordinates,
        },
      };
    }, {});
}

export const getLegendItemLabel = ({ label, value }: LegendDefinitionItem) => {
  if (typeof label === 'string') {
    return label;
  }
  if (typeof value === 'number') {
    const roundedValue = Math.round(value);
    return roundedValue === 0
      ? value.toFixed(2)
      : roundedValue.toLocaleString('en-US');
  }
  return value;
};

export const generateUniqueTableKey = (activityName: string) => {
  return `${activityName}_${Date.now()}`;
};
