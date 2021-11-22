import {
  CircularProgress,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import React, { ReactElement, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BoundaryLayerProps } from '../../../config/types';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries,
} from '../../../context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from '../../../config/utils';
import { layerDataSelector } from '../../../context/mapStateSlice/selectors';
import { LayerData } from '../../../context/layers/layer-data';

const boundaryLayer = getBoundaryLayerSingleton();

/**
 * This component allows you to give the user the ability to select several admin_boundary cells.
 * This component also syncs with the map automatically, allowing users to select cells by clicking the map.
 * Selection mode is automatically toggled based off this component's lifecycle.
 */
function BoundaryDropdown({ ...rest }: BoundaryDropdownProps) {
  const dispatch = useDispatch();
  const selectedBoundaries = useSelector(getSelectedBoundaries);

  // toggle the selection mode as this component is created and destroyed.
  useEffect(() => {
    dispatch(setIsSelectionMode(true));
    return () => {
      dispatch(setIsSelectionMode(false));
    };
  });
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  if (!data) {
    return <CircularProgress />;
  }
  console.log(data);
  const categories: Array<{
    title: string;
    children: { value: string; label: string }[];
  }> = [];
  data.features.forEach(feature => {
    const parentCategory =
      feature.properties?.[boundaryLayer.adminLevelLocalNames[0]];
    const label = feature.properties?.[boundaryLayer.adminLevelLocalNames[1]];
    const code = feature.properties?.[boundaryLayer.adminCode];
    if (!label || !code || !parentCategory) {
      return;
    }
    // add to categories if exists
    const category = categories.find(c => c.title === parentCategory);
    if (category) {
      // eslint-disable-next-line fp/no-mutating-methods
      category.children.push({ value: code, label });
    } else {
      // eslint-disable-next-line fp/no-mutating-methods
      categories.push({
        title: parentCategory,
        children: [{ value: code, label }],
      });
    }
  });
  // this could be testable, needs to be constructed in a way that prevents it breaking whenever new layers are added. (don't put layer name in snapshot)

  const defaultValue = 'All';

  return (
    <FormControl {...rest}>
      <Select
        multiple
        value={selectedBoundaries}
        defaultValue={[defaultValue]}
        // TODO value
        onChange={e => {
          dispatch(
            setSelectedBoundaries(
              Array.isArray(e.target.value) ? e.target.value : [],
            ),
          );
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
            ...category.children.map(({ label, value }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            )),
          ],
          [
            <MenuItem key={defaultValue} value={defaultValue}>
              {defaultValue}
            </MenuItem>,
          ] as ReactElement[],
        )}
      </Select>
    </FormControl>
  );
}

interface BoundaryDropdownProps {
  // a way to type this and every other default thing in? e.g style
  className?: string;
}

export default BoundaryDropdown;
