import {
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  ListSubheader,
  makeStyles,
  MenuItem,
  Select,
  styled,
  TextField,
  TextFieldProps,
  Theme,
  Typography,
  useMediaQuery,
} from '@material-ui/core';
import { sortBy } from 'lodash';
import React, { forwardRef, ReactNode, useEffect, useState } from 'react';
import i18n from 'i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from '@material-ui/icons';
import { BoundaryLayerProps, AdminCodeString } from 'config/types';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries as setSelectedBoundariesRedux,
} from 'context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from 'config/utils';
import { layerDataSelector } from 'context/mapStateSlice/selectors';
import { LayerData } from 'context/layers/layer-data';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';

const boundaryLayer = getBoundaryLayerSingleton();
const ClickableListSubheader = styled(ListSubheader)(({ theme }) => ({
  // Override the default list subheader style to make it clickable
  pointerEvents: 'inherit',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.grey[100],
  },
}));
const useStyles = makeStyles((theme: Theme) => ({
  searchField: {
    '&>div': {
      color: 'black',
    },
  },
  dropdownMenu: {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    display: 'inline-flex',
    // temporary will be removed when the go to button will be revamped
    marginTop: '-10px',
    padding: theme.spacing(0.8, 2.66),
    borderRadius: '4px',
    alignItems: 'center',
    boxShadow: theme.shadows[2],
  },
  formControl: {
    width: '140px',
    marginLeft: '10px',
  },
  icon: {
    alignSelf: 'end',
    marginBottom: '0.4em',
  },
  root: {
    '&$selected': {
      backgroundColor: '#ADD8E6',
    },
  },
}));
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

export interface OrderedArea {
  children: {
    value: AdminCodeString;
    label: string;
    key: string;
  }[];
  title: string;
  key: string;
}
/**
 * Converts the boundary layer data into a list of options for the dropdown
 * grouped by admin level 2, with individual sections under admin level 3.
 */
export function getOrderedAreas(
  data: LayerData<BoundaryLayerProps>['data'],
  layer: BoundaryLayerProps,
  search: string,
  i18nLocale: typeof i18n,
  layerLevel: number = 0,
  parentCategoryValue?: string,
): OrderedArea[] {
  const locationLevelNames = isEnglishLanguageSelected(i18nLocale)
    ? layer.adminLevelNames
    : layer.adminLevelLocalNames;
  if (!layer.adminLevelNames.length) {
    console.error(
      'Boundary layer has no admin level names. Cannot generate categories.',
    );
    return [];
  }

  const layerLevel1 = layerLevel || 0;
  const layerLevel2 = layerLevel1 + 1;

  let { features } = data;
  // filter to get only layers having prentCategoryValue as parent layer
  // when layerLevel is 0, there is only one layer loaded
  // then parent category can't exist
  if (parentCategoryValue && layerLevel > 0) {
    // eslint-disable-next-line fp/no-mutation
    features = data.features.filter(
      feature =>
        feature.properties?.[layer.adminLevelNames[layerLevel - 1]] ===
        parentCategoryValue,
    );
  }

  // Make categories based off the level of all boundaries
  return sortBy(
    features
      .reduce<OrderedArea[]>((ret, feature) => {
        // unique parent key to filter when changing the language
        const parentKey =
          feature.properties?.[layer.adminLevelNames[layerLevel1]];
        const parentCategory =
          feature.properties?.[locationLevelNames[layerLevel1]];
        // unique child key to filter when changing the language
        const childkey =
          feature.properties?.[layer.adminLevelNames[layerLevel2]!];
        const label = feature.properties?.[locationLevelNames[layerLevel2]!];
        const code = feature.properties?.[layer.adminCode];
        if (!label || !code || !parentCategory || !parentKey) {
          return ret;
        }
        // filter via search
        const searchIncludes = (field: string) =>
          field.toLowerCase().includes(search.toLowerCase());
        if (
          search &&
          !searchIncludes(label) &&
          !searchIncludes(code) &&
          !searchIncludes(parentCategory) &&
          !searchIncludes(parentKey)
        ) {
          return ret;
        }
        // add to categories if exists
        const category = ret.find(c => c.key === parentKey);
        if (category) {
          // eslint-disable-next-line fp/no-mutating-methods
          category.children.push({ value: code, label, key: childkey });
        } else {
          return [
            ...ret,
            {
              key: parentKey,
              title: parentCategory,
              children: [{ value: code, label, key: childkey }],
            },
          ];
        }
        return ret;
      }, [])
      .map(category => ({
        ...category,
        children: sortBy(category.children, 'key'),
      })),
    'key',
  );
}

/**
 * This component allows you to give the user the ability to select several admin_boundary cells.
 * This component also syncs with the map automatically, allowing users to select cells by clicking the map.
 * Selection mode is automatically toggled based off this component's lifecycle.
 */
function SimpleBoundaryDropdown({
  selectedBoundaries,
  setSelectedBoundaries,
  labelMessage,
  selectAll,
  onlyNewCategory,
  ...rest
}: BoundaryDropdownProps) {
  const styles = useStyles();
  const { t, i18n: i18nLocale } = useSafeTranslation();
  const [search, setSearch] = useState('');

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  if (!data) {
    return <CircularProgress size={24} color="secondary" />;
  }
  const areas = getOrderedAreas(data, boundaryLayer, search, i18nLocale);
  const allChildrenAreas = areas.flatMap(c => c.children);
  const selectOrDeselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedBoundaries.length > 0) {
      setSelectedBoundaries([]);
    } else {
      setSelectedBoundaries(allChildrenAreas.map(({ value }) => value));
    }
  };
  // It's important for this to be another component, since the Select component
  // acts on the `value` prop, which we need to hide from <Select/> since this isn't a menu item.
  return (
    <FormControl {...rest}>
      <InputLabel>{labelMessage}</InputLabel>
      <Select
        multiple
        onClose={() => {
          // empty search so that component shows correct options
          // otherwise, we would only show selected options which satisfy the search
          setTimeout(() => setSearch(''), TIMEOUT_ANIMATION_DELAY);
        }}
        value={selectedBoundaries}
        // Current mui version does not have SelectChangeEvent<T>. Using any instead.
        onChange={(e: any) => {
          // do nothing if value is invalid
          // This happens when you click list subheadings.
          if (
            !Array.isArray(e.target.value) ||
            e.target.value.includes(undefined)
          ) {
            return;
          }

          setSelectedBoundaries(
            Array.isArray(e.target.value) ? e.target.value : [],
            e.shiftKey,
          );
        }}
      >
        <SearchField search={search} setSearch={setSearch} />
        {!search && selectAll && (
          <MenuItem onClick={selectOrDeselectAll}>
            {selectedBoundaries.length === 0
              ? t('Select All')
              : t('Deselect All')}
          </MenuItem>
        )}
        {search && allChildrenAreas.length === 0 && (
          <MenuItem disabled>{t('No Results')}</MenuItem>
        )}
        {areas.reduce<ReactNode[]>(
          // map wouldn't work here because <Select> doesn't support <Fragment> with keys, so we need one array
          (components, category) => [
            ...components,
            // don't add list subheader if there are no categories.
            boundaryLayer.adminLevelNames.length > 1 ? (
              <ClickableListSubheader
                key={category.title}
                onClick={e => {
                  e.preventDefault();
                  // if all children are selected, deselect all. Otherwise select all
                  const categoryValues = category.children.map(c => c.value);
                  const areAllChildrenSelected =
                    selectedBoundaries.filter(val =>
                      categoryValues.includes(val),
                    ).length === categoryValues.length;

                  const newBoundariesValue = onlyNewCategory
                    ? categoryValues
                    : [...selectedBoundaries, ...categoryValues];

                  setSelectedBoundaries(
                    areAllChildrenSelected
                      ? selectedBoundaries.filter(
                          val => !categoryValues.includes(val),
                        )
                      : newBoundariesValue,
                    true,
                  );
                }}
              >
                <Typography variant="body2" color="primary">
                  {category.title}
                </Typography>
              </ClickableListSubheader>
            ) : null,
            ...category.children.map(({ label, value }) => (
              <MenuItem
                classes={{ root: styles.root }}
                key={value}
                value={value}
              >
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
  className: string;
  selectedBoundaries: AdminCodeString[];
  setSelectedBoundaries: (
    boundaries: AdminCodeString[],
    appendMany?: boolean,
  ) => void;
  labelMessage?: string;
  onlyNewCategory?: boolean;
  selectAll: boolean;
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
