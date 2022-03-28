import {
  Divider,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { menuList } from '../../NavBar/utils';
import { IconPoint, IconPolygon, IconRaster } from '../Icons';
import { LayerKey, LayerType, WMSLayerProps } from '../../../config/types';

interface LayerIconProps {
  lyr: WMSLayerProps | any;
  style?: React.CSSProperties;
}

function LayerIcon({ lyr, style }: LayerIconProps) {
  if (lyr.geometry === 'point') {
    return <IconPoint style={{ height: 15, ...style }} />;
  }
  if (lyr.geometry === 'polygon') {
    return <IconPolygon style={{ height: 15, ...style }} />;
  }
  return <IconRaster style={{ height: 15, ...style }} />;
}

function LayerDropdown({
  type,
  // types,
  value,
  setValue,
  placeholder,
  ...rest
}: LayerSelectorProps) {
  // this could be testable, needs to be constructed in a way that prevents it breaking whenever new layers are added. (don't put layer name in snapshot)

  const categories = menuList // we could memo this but it isn't impacting performance, for now
    // 1. flatten to just the layer categories, don't need the big menus
    .flatMap(menu => menu.layersCategories)
    // 2. get rid of layers within the categories which don't match the given type
    .map(category => ({
      ...category,
      layers: category.layers.filter(
        layer =>
          layer.type === 'wms' &&
          [undefined, 'point', 'polygon'].includes(layer.geometry),
      ),
    }))
    // 3. filter categories which don't have any layers at the end of it all.
    .filter(category => category.layers.length > 0);
  const defaultValue = 'placeholder';

  console.log('RENDERING');

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
                {category.title}
              </Typography>
            </ListSubheader>,
            ...category.layers.map(layer => (
              <MenuItem key={layer.id} value={layer.id}>
                {layer.title}
                <LayerIcon lyr={layer} style={{ marginLeft: 5 }} />
              </MenuItem>
            )),
          ],
          (placeholder
            ? [
                <MenuItem key={defaultValue} value={defaultValue} disabled>
                  {placeholder}
                </MenuItem>,
              ]
            : []) as ReactElement[],
        )}
        <Divider light />
        <Typography variant="subtitle2" color="primary" align="center">
          Data Types
        </Typography>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell align="center" style={{ width: '33%' }}>
                <Typography variant="body2" color="primary">
                  <IconPoint style={{ height: 15, marginRight: 5 }} />
                  Points
                </Typography>
              </TableCell>
              <TableCell align="center" style={{ width: '33%' }}>
                <Typography variant="body2" color="primary">
                  <IconPolygon style={{ height: 15, marginRight: 5 }} />
                  Polygons
                </Typography>
              </TableCell>
              <TableCell align="center" style={{ width: '33%' }}>
                <Typography variant="body2" color="primary">
                  <IconRaster style={{ height: 15, marginRight: 5 }} />
                  Raster
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Select>
    </FormControl>
  );
}

interface LayerSelectorProps {
  type: LayerType['type'];
  // types: Array<LayerType['type']>;
  value?: LayerKey;
  setValue: (val: LayerKey) => void;
  className?: string;
  placeholder?: string;
}
export default LayerDropdown;
