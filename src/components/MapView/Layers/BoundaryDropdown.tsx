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
  withStyles,
} from '@material-ui/core';
import { last, sortBy } from 'lodash';
import React, { forwardRef, ReactNode, useEffect, useState } from 'react';
import { Feature } from 'geojson';
import { multiPolygon, MultiPolygon, Polygon } from '@turf/helpers';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import union from '@turf/union';
import { useDispatch, useSelector } from 'react-redux';
import { Search, CenterFocusWeak } from '@material-ui/icons';
import { BoundaryLayerProps } from '../../../config/types';
import { appConfig } from '../../../config';
import {
  getSelectedBoundaries,
  setIsSelectionMode,
  setSelectedBoundaries as setSelectedBoundariesRedux,
} from '../../../context/mapSelectionLayerStateSlice';
import { getBoundaryLayerSingleton } from '../../../config/utils';
import { Extent } from './raster-utils';
import {
  layerDataSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { LayerData } from '../../../context/layers/layer-data';

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
    marginTop: '1em',
    padding: theme.spacing(1, 2.66),
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

/**
 * Converts the boundary layer data into a list of options for the dropdown
 * grouped by admin level 2, with individual sections under admin level 3.
 */
function getCategories(
  data: LayerData<BoundaryLayerProps>['data'],
  search: string,
) {
  if (!boundaryLayer.adminLevelNames.length) {
    console.error(
      'Boundary layer has no admin level names. Cannot generate categories.',
    );
    return [];
  }

  // Make categories based off the level of all boundaries
  return sortBy(
    data.features
      .reduce<
        Array<{
          title: string;
          children: { value: string; label: string }[];
        }>
      >((ret, feature) => {
        const parentCategory =
          feature.properties?.[boundaryLayer.adminLevelNames[0]];
        const label =
          feature.properties?.[last(boundaryLayer.adminLevelNames)!];
        const code = feature.properties?.[boundaryLayer.adminCode];
        if (!label || !code || !parentCategory) {
          return ret;
        }
        // filter via search
        const searchIncludes = (field: string) =>
          field.toLowerCase().includes(search.toLowerCase());
        if (
          search &&
          !searchIncludes(label) &&
          !searchIncludes(code) &&
          !searchIncludes(parentCategory)
        ) {
          return ret;
        }
        // add to categories if exists
        const category = ret.find(c => c.title === parentCategory);
        if (category) {
          // eslint-disable-next-line fp/no-mutating-methods
          category.children.push({ value: code, label });
        } else {
          return [
            ...ret,
            {
              title: parentCategory,
              children: [{ value: code, label }],
            },
          ];
        }
        return ret;
      }, [])
      .map(category => ({
        ...category,
        // sort children by label
        children: sortBy(category.children, 'label'),
      })),
    // then finally sort categories.
    'title',
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
  ...rest
}: BoundaryDropdownProps) {
  const [search, setSearch] = useState('');

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  if (!data) {
    return <CircularProgress size={24} color="secondary" />;
  }
  const categories = getCategories(data, search);
  const allChildren = categories.flatMap(c => c.children);
  const selectOrDeselectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedBoundaries.length > 0) {
      setSelectedBoundaries([]);
    } else {
      setSelectedBoundaries(allChildren.map(({ value }) => value));
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
        onChange={e => {
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
          );
        }}
      >
        <SearchField search={search} setSearch={setSearch} />
        {!search && (
          <MenuItem onClick={selectOrDeselectAll}>
            {selectedBoundaries.length === 0 ? 'Select All' : 'Deselect All'}
          </MenuItem>
        )}
        {search && allChildren.length === 0 && (
          <MenuItem disabled>No Results</MenuItem>
        )}
        {categories.reduce<ReactNode[]>(
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

                  setSelectedBoundaries(
                    areAllChildrenSelected
                      ? selectedBoundaries.filter(
                          val => !categoryValues.includes(val),
                        )
                      : [...selectedBoundaries, ...categoryValues],
                  );
                }}
              >
                <Typography variant="body2" color="primary">
                  {category.title}
                </Typography>
              </ClickableListSubheader>
            ) : null,
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
  className: string;
  selectedBoundaries: string[];
  setSelectedBoundaries: (boundaries: string[]) => void;
  labelMessage?: string;
}

/**
 * A HOC (higher order component) that connects the boundary dropdown to redux state
 */
function BoundaryDropdown({
  ...rest
}: Omit<
  BoundaryDropdownProps,
  'selectedBoundaries' | 'setSelectedBoundaries' | 'labelMessage'
>) {
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.only('xs'),
  );
  const labelMessage = `${isMobile ? 'Tap' : 'Click'} the map to select`;

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
    />
  );
}

export const SelectMenu = withStyles(() => ({
  root: {
    '& label': {
      textTransform: 'uppercase',
      letterSpacing: '3px',
      fontSize: '11px',
      position: 'absolute',
      top: '-13px',
    },
    '& svg': { color: 'white', fontSize: '1.25rem' },
    '& .MuiInput-root': { margin: 0 },
    '& .MuiInputLabel-shrink': { display: 'none' },
  },
}))(SimpleBoundaryDropdown);

export const BoundaryDropdownMap = () => {
  const map = useSelector(mapSelector);

  const [region, setRegion] = useState<string[]>([]);

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};

  const styles = useStyles();

  if (!data || !map) {
    return null;
  }

  return (
    <div className={styles.dropdownMenu}>
      <CenterFocusWeak fontSize="small" className={styles.icon} />
      <SelectMenu
        selectedBoundaries={region}
        labelMessage="Go to"
        className={styles.formControl}
        setSelectedBoundaries={newSelectedBoundaries => {
          setRegion(
            newSelectedBoundaries.length > 2
              ? newSelectedBoundaries
              : newSelectedBoundaries.slice(-1),
          );

          if (newSelectedBoundaries.length === 0) {
            const {
              map: { latitude, longitude, zoom },
            } = appConfig;

            map.flyTo({ center: { lng: longitude, lat: latitude }, zoom });

            return;
          }

          const geometries = data.features
            .filter(f =>
              newSelectedBoundaries.includes(
                f.properties && f.properties[boundaryLayer.adminCode],
              ),
            )
            .filter(f => f.geometry.type === 'MultiPolygon')
            .map(f => f.geometry as MultiPolygon);

          const bboxes = geometries.map(geom => {
            const turfObj = multiPolygon(geom.coordinates);
            const geomBbox = bbox(turfObj);

            return geomBbox;
          });

          const bboxPolygons = bboxes.map(box => bboxPolygon(box));
          const unionBbox = bboxPolygons.reduce((unionPolygon, polygon) => {
            const unionObj = union(unionPolygon, polygon);
            if (!unionObj) {
              return unionPolygon;
            }
            return unionObj as Feature<Polygon>;
          }, bboxPolygons[0]);

          map.fitBounds(bbox(unionBbox) as Extent, {
            padding: 30,
          });
        }}
      />
    </div>
  );
};

export default BoundaryDropdown;
