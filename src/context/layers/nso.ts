import { FeatureCollection } from 'geojson';
import { isNull, isString } from 'lodash';
import { LayerDataParams } from './layer-data';
import { NSOLayerProps } from '../../config/types';

// FIXME: for now, directly import these files. This bloats the code bundle - they should be hosted externally.
import nsoDisabled from '../../data/nso/NSO_Disabled_Admin1_Total.json';
import nsoHerders from '../../data/nso/NSO_Herder_HHs_Admin2.json';
import nsoHerdsize from '../../data/nso/NSO_Herd_Size_Admin1_LT_200.json';
import nsoChild from '../../data/nso/NSO_Child_U5_Admin2.json';
import nsoLivestock from '../../data/nso/NSO_Livestock_Count_ths_Admin2.json';
import nsoHayHarvest from '../../data/nso/NSO_Hay_Harvest_Admin2.json';
import nsoElderly from '../../data/nso/NSO_Single_Elderly_Admin1_Total.json';
import nsoPoverty from '../../data/nso/NSO_Poverty_Headcount_Admin1.json';
import nsoPop from '../../data/nso/NSO_Population_Admin2_Total.json';
import adminBoundariesRaw from '../../config/admin_boundaries.json';
import mvamCash from '../../data/nso/mVAM_Cash_Reserves.json';
import mvamFodder from '../../data/nso/mVAM_Fodder_Reserves.json';
import mvamHayprices from '../../data/nso/mVAM_Hay_Price.json';
import mvamHayreserves from '../../data/nso/mVAM_Hay_Reserves.json';

const adminBoundaries = adminBoundariesRaw as FeatureCollection;

const nsoDatasets = {
  nsoDisabled,
  nsoHerders,
  nsoHerdsize,
  nsoChild,
  nsoLivestock,
  nsoHayHarvest,
  nsoElderly,
  nsoPoverty,
  nsoPop,
  mvamCash,
  mvamFodder,
  mvamHayprices,
  mvamHayreserves,
} as const;

type DataRecord = {
  adminKey: string;
  value: string | number | null;
};

export type NSOLayerData = {
  features: FeatureCollection;
  layerData: DataRecord[];
};

const isNSOKey = (maybeKey: string): maybeKey is keyof typeof nsoDatasets =>
  Object.keys(nsoDatasets).includes(maybeKey);

export async function fetchNsoLayerData(
  params: LayerDataParams<NSOLayerProps>,
) {
  const { layer } = params;
  const { path, adminCode } = layer;

  // TODO: make async request for external data here.
  if (!isNSOKey(path)) {
    throw new Error(`Unknown NSO dataset key '${path}' found.`);
  }
  const {
    DataList: rawJSON,
  }: { DataList: { [key: string]: any }[] } = nsoDatasets[path];

  const layerData = (rawJSON || [])
    .map(point => {
      const adminKey = point[adminCode];
      if (!adminKey) {
        return undefined;
      }
      const value = point.DTVAL_CO !== undefined ? point.DTVAL_CO : null;
      return { adminKey, value };
    })
    .filter((v): v is DataRecord => v !== undefined);

  const features = {
    ...adminBoundaries,
    features: adminBoundaries.features
      .map(feature => {
        const { properties } = feature;
        const nsoCode = (properties || {}).NSO_CODE;
        const match = layerData.find(
          ({ adminKey }) => nsoCode.indexOf(adminKey) === 0,
        );
        if (match && !isNull(match.value)) {
          // Do we want support for non-numeric values (like string colors?)
          return {
            ...feature,
            properties: {
              ...properties,
              data: isString(match.value)
                ? parseFloat(match.value)
                : match.value,
            },
          };
        }
        return undefined;
      })
      .filter(f => f !== undefined),
  } as FeatureCollection;

  return {
    features,
    layerData,
  };
}
