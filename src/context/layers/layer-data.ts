import { createAsyncThunk } from '@reduxjs/toolkit';
import { DiscriminateUnion, LayerType } from '../../config/types';
import { Extent } from '../../components/MapView/Layers/raster-utils';
import { CreateAsyncThunkTypes, ThunkApi } from '../store';
import { fetchNsoLayerData, NSOLayerData } from './nso';
import { ImpactLayerData, fetchImpactLayerData } from './impact';
import { WMSLayerData, fetchWMSLayerData } from './wms';
import {
  fetchGroundstationData,
  GroundstationLayerData,
} from './groundstation';

type LayerSpecificDataTypes = {
  wms: WMSLayerData;
  impact: ImpactLayerData;
  nso: NSOLayerData;
  groundstation: GroundstationLayerData;
};

export interface LayerData<L extends LayerType> {
  layer: L;
  date: number;
  extent?: Extent;
  data: LayerSpecificDataTypes[L['type']];
}

export interface LayerDataParams<T extends LayerType> {
  layer: T;
  extent?: Extent;
  date?: number;
  [key: string]: any;
}

// Create a union of all the possible param types
type ParamsTypeMap = {
  [key in LayerType['type']]: LayerDataParams<
    DiscriminateUnion<LayerType, 'type', key>
  >;
};
type ParamTypes = ParamsTypeMap[keyof ParamsTypeMap];

// Create a union of all the possible return types
type LayerDataMap = {
  [key in LayerType['type']]: LayerData<
    DiscriminateUnion<LayerType, 'type', key>
  >;
};
export type LayerDataTypes = LayerDataMap[keyof LayerDataMap];

// Define a type for the object mapping layer type to fetch function
type LayerLoaders = {
  [key in LayerType['type']]: (
    params: LayerDataParams<DiscriminateUnion<LayerType, 'type', key>>,
    api: ThunkApi,
  ) => Promise<LayerSpecificDataTypes[key]>;
};

// Less restrictive handler type since Typescript doesn't support nested union discrimination
type HandlerType = (
  params: LayerDataParams<any>,
  api: ThunkApi,
) => Promise<LayerSpecificDataTypes[keyof LayerSpecificDataTypes]>;

export const loadLayerData = createAsyncThunk<
  LayerDataTypes,
  ParamTypes,
  CreateAsyncThunkTypes
>('mapState/loadLayerData', async (params, thunkApi) => {
  const { layer, extent, date } = params;
  const layerLoaders: LayerLoaders = {
    impact: fetchImpactLayerData,
    wms: fetchWMSLayerData,
    nso: fetchNsoLayerData,
    groundstation: fetchGroundstationData,
  };
  const handler: HandlerType = layerLoaders[layer.type];
  const layerData = await handler(params, thunkApi);
  // Need to cast this since TS isn't smart enough to match layer & layerData types based on the nested discrimator
  // field `layer.type`.
  return {
    layer,
    extent,
    date,
    data: layerData,
  } as LayerDataTypes;
});
