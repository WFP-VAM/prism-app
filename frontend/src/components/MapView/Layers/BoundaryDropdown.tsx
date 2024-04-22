import { SelectProps, Theme, useMediaQuery } from '@material-ui/core';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AdminCodeString } from 'config/types';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries as setSelectedBoundariesRedux,
} from 'context/mapSelectionLayerStateSlice';
import { useSafeTranslation } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import SimpleBoundaryDropdown from './SimpleBoundaryDropdown';

export interface BoundaryDropdownProps {
  className: string;
  labelMessage?: string;
  map?: MaplibreMap | undefined;
  onlyNewCategory?: boolean;
  selectAll?: boolean;
  size?: 'small' | 'medium';
  selectedBoundaries?: AdminCodeString[];
  setSelectedBoundaries?: (
    boundaries: AdminCodeString[],
    appendMany?: boolean,
  ) => void;
  selectProps?: SelectProps;
  goto?: boolean;
  multiple?: boolean;
}

/**
 * A HOC (higher order component) that connects the boundary dropdown to redux state
 */
function BoundaryDropdown({
  ...rest
}: Omit<
  BoundaryDropdownProps,
  'selectedBoundaries' | 'setSelectedBoundaries' | 'labelMessage' | 'selectAll'
>) {
  const { t } = useSafeTranslation();
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.only('xs'),
  );
  const labelMessage = t(`${isMobile ? 'Tap' : 'Click'} the map to select`);

  const dispatch = useDispatch();
  const selectedBoundaries = useSelector(getSelectedBoundaries);
  // toggle the selection mode as this component is created and destroyed.
  // (users can only click the map to select while this component is visible)
  useEffect(() => {
    dispatch(setIsSelectionMode(true));
    return () => {
      dispatch(setIsSelectionMode(false));
    };
  }, [dispatch]);
  return (
    <SimpleBoundaryDropdown
      {...rest}
      selectedBoundaries={selectedBoundaries}
      setSelectedBoundaries={newSelectedBoundaries => {
        dispatch(setSelectedBoundariesRedux(newSelectedBoundaries));
      }}
      labelMessage={labelMessage}
      selectAll
    />
  );
}

export default BoundaryDropdown;
