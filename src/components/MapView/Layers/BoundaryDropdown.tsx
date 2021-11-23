import {
  CircularProgress,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  styled,
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
const ClickableListSubheader = styled(ListSubheader)(({ theme }) => ({
  pointerEvents: 'inherit',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

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
  }, [dispatch]);
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  if (!data) {
    return <CircularProgress size={24} color="secondary" />;
  }
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
  const selectOrDeselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedBoundaries.length > 0) {
      dispatch(setSelectedBoundaries([]));
    } else {
      dispatch(
        setSelectedBoundaries(
          categories.flatMap(c => c.children.map(({ value }) => value)),
        ),
      );
    }
  };

  return (
    <FormControl {...rest}>
      <Select
        multiple
        value={selectedBoundaries}
        onChange={e => {
          // do nothing if value is invalid
          // This happens when you click list subheadings.
          if (
            !Array.isArray(e.target.value) ||
            e.target.value.includes(undefined)
          ) {
            return;
          }
          dispatch(
            setSelectedBoundaries(
              Array.isArray(e.target.value) ? e.target.value : [],
            ),
          );
        }}
      >
        <MenuItem onClick={selectOrDeselectAll}>
          {selectedBoundaries.length === 0 ? 'Select All' : 'Deselect All'}
        </MenuItem>
        {categories.reduce<ReactElement[]>(
          // map wouldn't work here because <Select> doesn't support <Fragment> with keys, so we need one array
          (components, category) => [
            ...components,
            <ClickableListSubheader
              key={category.title}
              style={{
                // Override the default list subheader style to make it clickable
                pointerEvents: 'inherit',
                cursor: 'pointer',
              }}
              onClick={e => {
                e.preventDefault();
                // if at least one is selected, deselect all. Otherwise select all
                const categoryValues = category.children.map(c => c.value);
                const selectedChildren =
                  selectedBoundaries.filter(val => categoryValues.includes(val))
                    .length > 0;
                dispatch(
                  setSelectedBoundaries(
                    selectedChildren
                      ? selectedBoundaries.filter(
                          val => !categoryValues.includes(val),
                        )
                      : [...selectedBoundaries, ...categoryValues],
                  ),
                );
              }}
            >
              <Typography variant="body2" color="primary">
                {category.title}
              </Typography>
            </ClickableListSubheader>,
            ...category.children.map(({ label, value }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            )),
          ],
          [],
        )}
      </Select>
    </FormControl>
  );
}

interface BoundaryDropdownProps {
  className?: string;
}

export default BoundaryDropdown;
