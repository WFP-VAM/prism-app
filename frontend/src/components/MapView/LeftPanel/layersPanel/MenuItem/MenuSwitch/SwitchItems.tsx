import { CompositeLayerProps, LayerType } from 'config/types';
import { makeStyles, createStyles } from '@mui/styles';
import { getCompositeLayers } from 'config/utils';
import { Fragment, memo } from 'react';
import { Extent } from 'components/MapView/Layers/raster-utils';
;
import { useMapState } from 'utils/useMapState';
import SwitchItem from './SwitchItem';

const useStyles = makeStyles(() =>
  createStyles({
    compositeLayersContainer: {
      display: 'flex',
      flexDirection: 'column',
      marginLeft: '24px',
      marginBottom: '12px',
      fontStyle: 'italic',
      borderLeft: '1px #B1D6DB solid',
    },
  }),
);

interface SwitchItemsProps {
  layers: LayerType[];
  extent?: Extent;
}
const SwitchItems = memo(({ layers, extent }: SwitchItemsProps) => {
  const mapState = useMapState();
  const selectedLayers = mapState.layers;
  const classes = useStyles();
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
              <div className={classes.compositeLayersContainer}>
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
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
});

export default SwitchItems;
