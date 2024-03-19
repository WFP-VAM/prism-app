import {
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  SelectProps,
  TextField,
  TextFieldProps,
  Theme,
  useMediaQuery,
} from '@material-ui/core';
import { sortBy } from 'lodash';
import React, { forwardRef, useEffect, useState } from 'react';
import i18n from 'i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from '@material-ui/icons';
import bbox from '@turf/bbox';
import { FixedSizeList as List } from 'react-window';
import {
  BoundaryLayerProps,
  AdminCodeString,
  AdminLevelType,
} from 'config/types';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries as setSelectedBoundariesRedux,
} from 'context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { BBox } from '@turf/helpers';
import { Map as MaplibreMap } from 'maplibre-gl';

const boundaryLayer = getBoundaryLayerSingleton();

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
const TIMEOUT_ANIMATION_DELAY = 10;
const SearchField = forwardRef(
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

/**
 * A tree of admin boundary areas, starting from
 * a single "root" element.
 */
export interface AdminBoundaryTree {
  label: string;
  key: AdminCodeString; // FIXME: duplicate of adminCode below?
  adminCode: AdminCodeString;
  level: AdminLevelType;
  // children are indexed by AdminCodeStrings, not strings
  // but typescript won't allow being more specific
  children: { [code: string]: AdminBoundaryTree };
}

/**
 * Flattened version of the tree above, used to build
 * dropdowns.
 */
interface FlattenedAdminBoundary {
  label: string;
  key: AdminCodeString;
  adminCode: AdminCodeString;
  level: AdminLevelType;
}

/**
 * Build a tree representing the hierarchy of admin
 * boundaries for the given data layer.
 */
export function getAdminBoundaryTree(
  data: LayerData<BoundaryLayerProps>['data'] | undefined,
  layer: BoundaryLayerProps,
  i18nLocale: typeof i18n,
): AdminBoundaryTree {
  const locationLevelNames = isEnglishLanguageSelected(i18nLocale)
    ? layer.adminLevelNames
    : layer.adminLevelLocalNames;
  const { adminLevelCodes } = layer;
  const { features } = data || {};

  const rootNode = {
    adminCode: 'top' as AdminCodeString,
    level: 0 as AdminLevelType,
    key: 'root' as AdminCodeString,
    label: 'Placeholder tree element',
    children: {},
  };
  if (features === undefined) {
    return rootNode;
  }

  const addBranchToTree = (
    partialTree: AdminBoundaryTree,
    levelsLeft: AdminCodeString[],
    feature: any, // TODO: maplibre: feature
    level: AdminLevelType,
  ): AdminBoundaryTree => {
    const fp = feature.properties;
    if (levelsLeft.length === 0) {
      return partialTree;
    }
    const [currentLevelCode, ...otherLevelsCodes] = levelsLeft;
    const newBranch = addBranchToTree(
      partialTree.children[fp[currentLevelCode]] ?? {
        adminCode: fp[currentLevelCode],
        key: fp[layer.adminLevelNames[level]],
        label: fp[locationLevelNames[level]],
        level: (level + 1) as AdminLevelType,
        children: {},
      },
      otherLevelsCodes,
      feature,
      (level + 1) as AdminLevelType,
    );
    const newChildren = {
      ...partialTree.children,
      [fp[currentLevelCode]]: newBranch,
    };
    return { ...partialTree, children: newChildren };
  };

  return features.reduce<AdminBoundaryTree>((outputTree, feature) => {
    return addBranchToTree(
      outputTree,
      adminLevelCodes,
      feature,
      0 as AdminLevelType,
    );
  }, rootNode);
}

function flattenAreaTree(
  tree: AdminBoundaryTree,
  search: string = '',
): FlattenedAdminBoundary[] {
  function flattenSubTree(
    subTree: AdminBoundaryTree,
  ): FlattenedAdminBoundary[] {
    const { children, ...rest } = subTree;
    const childrenToShow = sortBy(Object.values(children), 'label').flatMap(
      flattenSubTree,
    );
    if (
      childrenToShow.length > 0 ||
      rest.label.toLowerCase().includes(search.toLowerCase())
    ) {
      return [rest, childrenToShow].flat();
    }
    return childrenToShow.flat();
  }
  return flattenSubTree(tree);
}

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

export const BoundaryDropdownOptions = React.forwardRef(
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
  onlyNewCategory,
  selectProps,
  goto,
  multiple = true,
  ...rest
}: BoundaryDropdownProps) {
  const { i18n: i18nLocale } = useSafeTranslation();
  const [search, setSearch] = useState('');

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};

  if (!data) {
    // padding is used to make sure the loading spinner doesn't shift the menu size
    return (
      <CircularProgress size={24} color="inherit" style={{ padding: '2px' }} />
    );
  }

  const areaTree = getAdminBoundaryTree(data, boundaryLayer, i18nLocale);
  const flattenedAreaList = flattenAreaTree(areaTree, search).slice(1);

  // It's important for this to be another component, since the Select component
  // acts on the `value` prop, which we need to hide from <Select /> since this isn't a menu item.
  const out = (
    <FormControl {...rest}>
      <InputLabel>{labelMessage}</InputLabel>
      <Select
        style={{ color: 'black' }}
        multiple
        onClose={() => {
          // empty search so that component shows correct options
          // otherwise, we would only show selected options which satisfy the search
          setTimeout(() => setSearch(''), TIMEOUT_ANIMATION_DELAY);
        }}
        value={selectedBoundaries}
        // This is a workaround to display the selected items as a comma separated list.
        renderValue={selected =>
          (selected as AdminCodeString[])
            .map(
              adminCode =>
                flattenedAreaList.find(area => area.adminCode === adminCode)
                  ?.label || adminCode,
            )
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

interface BoundaryDropdownProps {
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
