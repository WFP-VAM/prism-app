import {
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { menuList } from '../../NavBar/utils';
import { LayerKey, LayerType } from '../../../config/types';
import { useSafeTranslation } from '../../../i18n';
import { getLayerGeometryIcon } from './layer-utils';

function LayerDropdown({
  type,
  value,
  setValue,
  placeholder,
  ...rest
}: LayerSelectorProps) {
  // this could be testable, needs to be constructed in a way that prevents it breaking whenever new layers are added. (don't put layer name in snapshot)

  const { t } = useSafeTranslation();

  const categories = menuList // we could memo this but it isn't impacting performance, for now
    // 1. flatten to just the layer categories, don't need the big menus
    .flatMap(menu => menu.layersCategories)
    // 2. get rid of layers within the categories which don't match the given type
    .map(category => ({
      ...category,
      layers: category.layers.filter(layer =>
        layer.type === 'wms'
          ? layer.type === type &&
            [undefined, 'polygon'].includes(layer.geometry)
          : layer.type === type,
      ),
    }))
    // 3. filter categories which don't have any layers at the end of it all.
    .filter(category => category.layers.length > 0);
  const defaultValue = 'placeholder';

  return (
    <FormControl {...rest}>
      <Select
        defaultValue={defaultValue}
        value={value}
        onChange={e => {
          setValue(e.target.value as LayerKey);
        }}
      >
        {categories.reduce(
          // map wouldn't work here because <Select> doesn't support <Fragment> with keys, so we need one array
          (components, category) => [
            ...components,
            <ListSubheader key={category.title}>
              <Typography variant="body2" color="primary">
                {t(category.title)}
              </Typography>
            </ListSubheader>,
            ...category.layers.map(layer => (
              <MenuItem key={layer.id} value={layer.id}>
                {t(layer.title || '')}
                {getLayerGeometryIcon(layer)}
              </MenuItem>
            )),
          ],
          (placeholder
            ? [
                <MenuItem key={defaultValue} value={defaultValue} disabled>
                  {t(placeholder)}
                </MenuItem>,
              ]
            : []) as ReactElement[],
        )}
      </Select>
    </FormControl>
  );
}

interface LayerSelectorProps {
  type: LayerType['type'];
  value?: LayerKey;
  setValue: (val: LayerKey) => void;
  className?: string;
  placeholder?: string;
}
export default LayerDropdown;
