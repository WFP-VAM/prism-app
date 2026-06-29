import { Search } from '@mui/icons-material';
import {
  InputAdornment,
  MenuItem,
  TextField,
  TextFieldProps,
} from '@mui/material';
import bbox from '@turf/bbox';
import { LayerKey } from 'config/types';
import { BoundaryLayerData } from 'context/layers/boundary';
import { useCountryIso } from 'context/useCountryIso';
import { BBox } from 'geojson';
import { useSafeTranslation } from 'i18n';
import { Map as MaplibreMap } from 'maplibre-gl';
import React, { useEffect, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { boundaryCache } from 'utils/boundary-cache';
import { getDisplayBoundaryLayersForIso3 } from 'utils/universal-utils';

import {
  menuItemLevelSx,
  searchFieldSx,
} from './boundaryDropdownOptionsStyles';
import {
  BoundaryDropdownProps,
  flattenAreaTree,
  getAdminBoundaryTree,
  TIMEOUT_ANIMATION_DELAY,
} from './utils';

const SearchField = React.forwardRef(
  (
    {
      // important this isn't called `value` since this would confuse <Select/>
      // the main purpose of wrapping this text-field is for this very purpose.
      search,
      setSearch,
    }: {
      search: string;
      setSearch: (val: string) => void;
    },
    ref: TextFieldProps['ref'],
  ) => {
    return (
      <TextField
        ref={ref}
        fullWidth
        onKeyDown={e => e.stopPropagation()}
        sx={searchFieldSx}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          // when something is selected, and the user tries to search, this field deselects for some reason,
          // thus reselect on change. Important to capture target as it's null inside timeout.
          const { target } = e;
          setTimeout(() => {
            target.focus();
          }, TIMEOUT_ANIMATION_DELAY);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          },
        }}
      />
    );
  },
);

const BoundaryDropdownOptions = React.forwardRef(
  (
    {
      search,
      setSearch,
      selectedBoundaries,
      setSelectedBoundaries,
      selectAll,
      goto,
      map,
      multiple = true,
      listWidth = 350,
    }: BoundaryDropdownOptionsProps,
    ref,
  ) => {
    const { t, i18n: i18nLocale } = useSafeTranslation();
    const { iso3 } = useCountryIso();
    const boundaryLayers = getDisplayBoundaryLayersForIso3(iso3).filter(
      layer => !layer.hideInGoTo,
    );
    const [, setCacheVersion] = useState(0);

    useEffect(
      () => boundaryCache.subscribe(() => setCacheVersion(v => v + 1)),
      [],
    );

    const baseBoundaryLayerData = boundaryCache.getCachedData(
      boundaryLayers[0]?.id,
      iso3,
    );

    // Get all boundary layer data from cache
    const allBoundaryLayerData = boundaryLayers.reduce(
      (acc, layer) => {
        acc[layer.id] = boundaryCache.getCachedData(layer.id, iso3);
        return acc;
      },
      {} as Record<LayerKey, BoundaryLayerData | undefined>,
    );

    // Combine the data from all layers
    const combinedData = useMemo(() => {
      const layerData = Object.entries(allBoundaryLayerData)
        .filter(([, data]) => data !== undefined)
        .map(([layerId, data]) => ({
          layerId,
          data: data as BoundaryLayerData,
        }));

      if (!layerData.length) {
        return undefined;
      }

      return {
        type: 'FeatureCollection' as const,
        features: layerData.flatMap(({ layerId, data }) => {
          const layer = boundaryLayers.find(l => l.id === layerId);
          return layer?.hideInGoTo ? [] : data.features || [];
        }),
      };
    }, [allBoundaryLayerData, boundaryLayers]);

    const areaTree = useMemo(
      () =>
        getAdminBoundaryTree(
          baseBoundaryLayerData as BoundaryLayerData,
          boundaryLayers[0],
          i18nLocale,
        ),
      [baseBoundaryLayerData, boundaryLayers, i18nLocale],
    );

    const flattenedAreaList = useMemo(
      () => flattenAreaTree(areaTree, search),
      [areaTree, search],
    );

    if (!combinedData || !boundaryLayers.length) {
      return null;
    }

    const rootLevel = flattenedAreaList[0]?.level;

    const selectOrDeselectAll = (e: React.MouseEvent) => {
      e.preventDefault();
      if (
        selectedBoundaries === undefined ||
        setSelectedBoundaries === undefined
      ) {
        return;
      }
      if (selectedBoundaries.length > 0) {
        setSelectedBoundaries([]);
      } else {
        setSelectedBoundaries(
          flattenedAreaList.map(({ adminCode }) => adminCode),
        );
      }
    };

    // map adminLevels to a CSS class for each level
    // note that level actually used is different from the
    // official admin level, as we subtract the root level
    // from each item's level, when displaying
    return (
      <>
        <SearchField search={search} setSearch={setSearch} />
        {!search && selectAll && selectedBoundaries && (
          <MenuItem onClick={selectOrDeselectAll}>
            {selectedBoundaries.length === 0
              ? t('Select All')
              : t('Deselect All')}
          </MenuItem>
        )}
        {search && flattenedAreaList.length === 0 && (
          <MenuItem disabled>{t('No Results')}</MenuItem>
        )}
        <List
          height={700}
          itemCount={flattenedAreaList.length}
          itemSize={35}
          width={listWidth}
        >
          {({ index, style }) => {
            const area = flattenedAreaList[index];
            return (
              <MenuItem
                ref={ref as any}
                sx={menuItemLevelSx[(area.level - rootLevel) as number]}
                key={area.adminCode}
                value={area.adminCode}
                style={style as any}
                selected={selectedBoundaries?.includes(area.adminCode)}
                onClick={event => {
                  event.stopPropagation();
                  const newSelectedBoundaries = multiple
                    ? [...(selectedBoundaries || [])]
                    : [];
                  const itemIndex = newSelectedBoundaries.indexOf(
                    area.adminCode,
                  );
                  if (itemIndex === -1) {
                    newSelectedBoundaries.push(area.adminCode);
                  } else {
                    newSelectedBoundaries.splice(itemIndex, 1);
                  }
                  if (setSelectedBoundaries !== undefined) {
                    setSelectedBoundaries(
                      newSelectedBoundaries,
                      event.shiftKey,
                    );

                    if (!goto) {
                      return;
                    }
                  }
                  if (map === undefined) {
                    return;
                  }
                  const features = combinedData.features.filter(f =>
                    boundaryLayers.some(layer =>
                      String(f.properties?.[layer.adminCode])?.startsWith(
                        area.adminCode,
                      ),
                    ),
                  );
                  const bboxUnion: BBox = bbox({
                    type: 'FeatureCollection',
                    features,
                  });
                  if (bboxUnion.length === 4) {
                    map.fitBounds(bboxUnion, { padding: 60 });
                  }
                }}
              >
                {area.label}
              </MenuItem>
            );
          }}
        </List>
      </>
    );
  },
);

interface BoundaryDropdownOptionsProps {
  search: string;
  setSearch: (v: string) => void;
  selectedBoundaries: BoundaryDropdownProps['selectedBoundaries'];
  setSelectedBoundaries?: BoundaryDropdownProps['setSelectedBoundaries'];
  selectAll?: boolean | undefined;
  goto?: boolean | undefined;
  map: MaplibreMap | undefined;
  multiple?: boolean;
  listWidth?: number;
}

export default BoundaryDropdownOptions;
