import { LayerType } from 'config/types';
import { getCompositeLayers } from 'config/utils';
import React, { Fragment, memo } from 'react';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { WithStyles, createStyles, withStyles } from '@material-ui/core';
import SwitchItem from './SwitchItem';

const styles = createStyles({
  compositeLayersContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginLeft: '24px',
    marginBottom: '12px',
    fontStyle: 'italic',
    borderLeft: '1px #B1D6DB solid',
  },
});

interface SwitchItemsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
  extent?: Extent;
}
const SwitchItems = ({ layers, extent, classes }: SwitchItemsProps) => {
  return (
    <>
      {layers.map((layer: LayerType) => {
        const foundNotRenderedLayer = layer.group?.layers.find(layerItem => {
          return layerItem.id === layer.id && !layerItem.main;
        });
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
                  />
                ))}
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
};

export default memo(withStyles(styles)(SwitchItems));
