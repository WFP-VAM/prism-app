import { createAsyncThunk, AsyncThunk } from '@reduxjs/toolkit';
import {
  DiscriminateUnion,
  LayerType,
  PointLayerData,
  StaticRasterLayerProps,
} from 'config/types';
import { Extent } from 'components/MapView/Layers/raster-utils';

import type { CreateAsyncThunkTypes, ThunkApi } from 'context/store';
import {
  fetchAdminLevelDataLayerData,
  AdminLevelDataLayerData,
} from './admin_level_data';
import { fetchWCSLayerData, WMSLayerData } from './wms';
import { fetchPointLayerData } from './point_data';
import { BoundaryLayerData, fetchBoundaryLayerData } from './boundary';
import { fetchImpactLayerData, ImpactLayerData } from './impact';
import { CompositeLayerData, fetchCompositeLayerData } from './composite_data';

export type LayerAcceptingDataType = Exclude<LayerType, StaticRasterLayerProps>;

type LayerSpecificDataTypes = {
  boundary: BoundaryLayerData;
  wms: WMSLayerData;
  impact: ImpactLayerData;
  // eslint-disable-next-line camelcase
  admin_level_data: AdminLevelDataLayerData;
  // eslint-disable-next-line camelcase
  point_data: PointLayerData | AdminLevelDataLayerData;
  composite: CompositeLayerData;
};

export interface LayerData<L extends LayerAcceptingDataType> {
  layer: L;
  date: number;
  extent?: Extent;
  data: LayerSpecificDataTypes[L['type']];
}

export interface LayerDataParams<T extends LayerAcceptingDataType> {
  layer: T;
  extent?: Extent;
  date?: number;

  [key: string]: any;
}

// Create a union of all the possible param types
type ParamsTypeMap = {
  [key in LayerAcceptingDataType['type']]: LayerDataParams<
    DiscriminateUnion<LayerAcceptingDataType, 'type', key>
  >;
};
type ParamTypes = ParamsTypeMap[keyof ParamsTypeMap];

// Create a union of all the possible return types
type LayerDataMap = {
  [key in LayerAcceptingDataType['type']]: LayerData<
    DiscriminateUnion<LayerAcceptingDataType, 'type', key>
  >;
};
export type LayerDataTypes = LayerDataMap[keyof LayerDataMap];

// Define a type for the object mapping layer type to fetch function
type LayerLoaders = {
  [key in LayerAcceptingDataType['type']]: LazyLoader<
    DiscriminateUnion<LayerAcceptingDataType, 'type', key>
  >;
};

// Less restrictive handler type since Typescript doesn't support nested union discrimination
export type LazyLoader<T extends LayerAcceptingDataType> = (
  recursive: LoadLayerDataFuncType, // just in case a loader wants to load another layer, we pass the function recursively to prevent import cycles.
) => (
  params: LayerDataParams<T>,
  api: ThunkApi,
) => Promise<LayerSpecificDataTypes[T['type']]>;

export const loadLayerData: LoadLayerDataFuncType = createAsyncThunk<
  LayerDataTypes,
  ParamTypes,
  CreateAsyncThunkTypes
>('mapState/loadLayerData', async (params, thunkApi) => {
  const { layer, extent, date } = params;
  const layerLoaders: LayerLoaders = {
    boundary: fetchBoundaryLayerData,
    impact: fetchImpactLayerData,
    wms: fetchWCSLayerData,
    admin_level_data: fetchAdminLevelDataLayerData,
    point_data: fetchPointLayerData,
    composite: fetchCompositeLayerData,
  };
  const lazyLoad: LazyLoader<any> = layerLoaders[layer.type];
  try {
    const layerData = await lazyLoad(loadLayerData)(params, thunkApi);
    // Need to cast this since TS isn't smart enough to match layer & layerData types based on the nested discriminator
    // field `layer.type`.
    return {
      layer,
      extent,
      date,
      data: layerData,
    } as LayerDataTypes;
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Failed to load layer: ${layer.id}. ${
        error?.message ? error.message : 'Check console for more details.'
      }`,
    );
  }
});

export type LoadLayerDataFuncType = AsyncThunk<
  LayerDataTypes, // return types
  ParamTypes, // function input types
  CreateAsyncThunkTypes
>;
