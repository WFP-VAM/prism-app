import {
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Theme,
  useMediaQuery,
} from '@material-ui/core';
import { AdminCodeString } from 'config/types';
import { getBoundaryLayerSingleton } from 'config/utils';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries as setSelectedBoundariesRedux,
} from 'context/mapSelectionLayerStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { useSafeTranslation } from 'i18n';
import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveAdminAreaRefs } from 'utils/adminAreaSelection';
import { getDisplayBoundaryLayersForIso3 } from 'utils/universal-utils';
import { useBoundaryData } from 'utils/useBoundaryData';

import BoundaryDropdownOptions from './BoundaryDropdownOptions';
import { BoundaryDropdownProps, TIMEOUT_ANIMATION_DELAY } from './utils';

/**
 * This component allows you to give the user the ability to select several admin_boundary cells.
 * This component also syncs with the map automatically, allowing users to select cells by clicking the map.
 * Selection mode is automatically toggled based off this component's lifecycle.
 */
export function SimpleBoundaryDropdown({
  selectedBoundaries,
  setSelectedBoundaries,
  labelMessage,
  map,
  selectAll,
  selectProps,
  goto,
  multiple = true,
  ...rest
}: BoundaryDropdownProps) {
  const { i18n: i18nLocale } = useSafeTranslation();
  const { iso3 } = useCountryIso();
  const [search, setSearch] = React.useState('');

  const boundaryLayer = useMemo(
    () =>
      getDisplayBoundaryLayersForIso3(iso3).filter(
        layer => !layer.hideInGoTo,
      )[0] ?? getBoundaryLayerSingleton(),
    [iso3],
  );

  const { data } = useBoundaryData(boundaryLayer.id);

  if (!data) {
    // padding is used to make sure the loading spinner doesn't shift the menu size
    return (
      <CircularProgress size={24} color="inherit" style={{ padding: '2px' }} />
    );
  }

  // It's important for this to be another component, since the Select component
  // acts on the `value` prop, which we need to hide from <Select /> since this isn't a menu item.
  const out = (
    <FormControl {...rest}>
      <InputLabel>{labelMessage}</InputLabel>
      <Select
        style={{ color: 'black' }}
        multiple
        placeholder={labelMessage}
        onClose={() => {
          // empty search so that component shows correct options
          // otherwise, we would only show selected options which satisfy the search
          setTimeout(() => setSearch(''), TIMEOUT_ANIMATION_DELAY);
        }}
        value={selectedBoundaries}
        // This is a workaround to display the selected items as a comma separated list.
        renderValue={selected =>
          resolveAdminAreaRefs(
            selected as AdminCodeString[],
            data,
            boundaryLayer,
            i18nLocale,
          )
            .map(ref => ref.name)
            .join(', ')
        }
        {...selectProps}
      >
        <BoundaryDropdownOptions
          search={search}
          setSearch={setSearch}
          selectedBoundaries={selectedBoundaries}
          setSelectedBoundaries={setSelectedBoundaries}
          selectAll={selectAll}
          goto={goto}
          map={map}
          multiple={multiple}
        />
      </Select>
    </FormControl>
  );

  return out;
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
  React.useEffect(() => {
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
