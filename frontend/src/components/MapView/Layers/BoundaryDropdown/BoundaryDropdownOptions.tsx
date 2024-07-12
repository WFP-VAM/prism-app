import {
  InputAdornment,
  makeStyles,
  MenuItem,
  TextField,
  TextFieldProps,
} from '@material-ui/core';
import React from 'react';
import { Map as MaplibreMap } from 'maplibre-gl';
import { useSafeTranslation } from 'i18n';
import { useSelector } from 'react-redux';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { getBoundaryLayerSingleton } from 'config/utils';
import { Search } from '@material-ui/icons';
import { LayerData } from 'context/layers/layer-data';
import { FixedSizeList as List } from 'react-window';
import { BBox } from 'geojson';
import bbox from '@turf/bbox';
import { BoundaryLayerProps } from 'config/types';
import {
  BoundaryDropdownProps,
  flattenAreaTree,
  getAdminBoundaryTree,
  TIMEOUT_ANIMATION_DELAY,
} from './utils';

const boundaryLayer = getBoundaryLayerSingleton();

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
    const styles = useStyles();
    return (
      <TextField
        ref={ref}
        onKeyDown={e => e.stopPropagation()}
        className={styles.searchField}
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
        InputProps={{
          startAdornment: (
            <InputAdornment position="end">
              <Search />
            </InputAdornment>
          ),
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
    }: BoundaryDropdownOptionsProps,
    ref,
  ) => {
    const styles = useStyles();
    const { t, i18n: i18nLocale } = useSafeTranslation();
    const boundaryLayerData = useSelector(
      layerDataSelector(boundaryLayer.id),
    ) as LayerData<BoundaryLayerProps> | undefined;
    const { data } = boundaryLayerData || {};

    if (!data) {
      return null;
    }

    const areaTree = getAdminBoundaryTree(data, boundaryLayer, i18nLocale);
    const flattenedAreaList = flattenAreaTree(areaTree, search).slice(1);
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
    const clsName: { [key: number]: any } = {
      0: styles.menuItem0,
      1: styles.menuItem1,
      2: styles.menuItem2,
      3: styles.menuItem3,
      4: styles.menuItem3,
    };
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
          width="350px"
        >
          {({ index, style }) => {
            const area = flattenedAreaList[index];
            return (
              <MenuItem
                ref={ref as any}
                classes={{
                  root: clsName[(area.level - rootLevel) as number],
                }}
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
                    // eslint-disable-next-line fp/no-mutating-methods
                    newSelectedBoundaries.push(area.adminCode);
                  } else {
                    // eslint-disable-next-line fp/no-mutating-methods
                    newSelectedBoundaries.splice(itemIndex, 1);
                  }
                  if (setSelectedBoundaries !== undefined) {
                    const boundariesToSelect = flattenedAreaList
                      .filter(b =>
                        newSelectedBoundaries.some((v: string) =>
                          b.adminCode.startsWith(v),
                        ),
                      )
                      .map(b => b.adminCode);

                    setSelectedBoundaries(boundariesToSelect, event.shiftKey);
                    if (!goto) {
                      return;
                    }
                  }
                  if (map === undefined) {
                    return;
                  }
                  const features = data.features.filter(
                    f =>
                      f &&
                      f.properties?.[boundaryLayer.adminCode].startsWith(
                        area.adminCode,
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

const useStyles = makeStyles({
  searchField: {
    '&>div': {
      color: 'black',
    },
  },
  formControl: {
    width: '140px',
    marginLeft: '10px',
  },
  icon: {
    alignSelf: 'end',
    marginBottom: '0.4em',
  },
  menuItem0: {
    textTransform: 'uppercase',
    letterSpacing: '3px',
    fontSize: '0.7em',
    '&$selected': {
      backgroundColor: '#ADD8E6',
    },
  },
  menuItem1: {
    paddingLeft: '2em',
    '&$selected': {
      backgroundColor: '#ADD8E6',
    },
  },
  menuItem2: {
    paddingLeft: '3em',
    fontSize: '0.9em',
    '&$selected': {
      backgroundColor: '#ADD8E6',
    },
  },
  menuItem3: {
    paddingLeft: '4em',
    fontSize: '0.9em',
    '&$selected': {
      backgroundColor: '#ADD8E6',
    },
  },
});

interface BoundaryDropdownOptionsProps {
  search: string;
  setSearch: (v: string) => void;
  selectedBoundaries: BoundaryDropdownProps['selectedBoundaries'];
  setSelectedBoundaries?: BoundaryDropdownProps['setSelectedBoundaries'];
  selectAll?: boolean | undefined;
  goto?: boolean | undefined;
  map: MaplibreMap | undefined;
  multiple?: boolean;
}

export default BoundaryDropdownOptions;
