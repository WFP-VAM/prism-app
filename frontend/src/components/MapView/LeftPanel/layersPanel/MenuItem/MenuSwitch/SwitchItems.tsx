import { Box } from '@mui/material';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { compositeLayersContainerSx } from 'components/MapView/LeftPanel/layersPanel/layerPanelStyles';
import { CompositeLayerProps, LayerType } from 'config/types';
import { getCompositeLayers } from 'config/utils';
import { Fragment, memo } from 'react';
import { useMapState } from 'utils/useMapState';

import SwitchItem from './SwitchItem';

interface SwitchItemsProps {
  layers: LayerType[];
  extent?: Extent;
}
const SwitchItems = memo(({ layers, extent }: SwitchItemsProps) => {
  const mapState = useMapState();
  const selectedLayers = mapState.layers;
  return (
    <>
      {layers.map((layer: LayerType) => {
        const foundNotRenderedLayer = layer.group?.layers.find(
          layerItem =>
            layerItem.id === layer.id &&
            !layerItem.main &&
            !selectedLayers.some(sl => sl.id === layerItem.id),
        );
        if (layer.group && foundNotRenderedLayer) {
          return null;
        }
        const compositeLayers = getCompositeLayers(layer);

        return (
          <Fragment key={layer.id}>
            <SwitchItem layer={layer} extent={extent} />
            {compositeLayers.length ? (
              <Box sx={compositeLayersContainerSx}>
                {compositeLayers.map(compositeLayer => (
                  <SwitchItem
                    key={compositeLayer.id}
                    layer={compositeLayer}
                    extent={extent}
                    groupMenuFilter={
                      (layer as CompositeLayerProps).inputLayers.find(
                        inputLayer => inputLayer.id === compositeLayer.id,
                      )?.id
                    }
                    disabledMenuSelection
                  />
                ))}
              </Box>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
});

export default SwitchItems;
