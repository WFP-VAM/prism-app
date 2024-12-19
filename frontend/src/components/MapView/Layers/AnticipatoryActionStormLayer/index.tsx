import React from 'react';
import { AnticipatoryActionLayerProps } from 'config/types';
import { useDefaultDate } from 'utils/useDefaultDate';

const AnticipatoryActionStormLayer = React.memo(({ layer }: LayersProps) => {
  useDefaultDate(layer.id);

  return null;
});
export interface LayersProps {
  layer: AnticipatoryActionLayerProps;
}

export default AnticipatoryActionStormLayer;
