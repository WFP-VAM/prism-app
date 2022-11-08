import React, { useState, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  makeStyles,
  MenuItem,
  Select,
  Theme,
} from '@material-ui/core';
import { useSelector } from 'react-redux';
import {
  layerDataSelector,
  mapSelector,
} from '../../../context/mapStateSlice/selectors';
import { getBoundaryLayerSingleton } from '../../../config/utils';
import SearchBar from './searchBar';
import {
  loadBoundaryDropdownData,
  setMenuItemStyle,
  containsText,
  getParentRelation,
  BoundaryRelation,
} from './utils';
import { BoundaryLayerProps } from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { isEnglishLanguageSelected, useSafeTranslation } from '../../../i18n';

const useStyles = makeStyles((theme: Theme) => {
  const menuItem = {
    fontSize: '0.8em',
    paddingLeft: '2em',
  };

  return {
    header: {
      ...menuItem,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      paddingLeft: '1em',
    },
    subHeader: {
      ...menuItem,
      fontWeight: 'bold',
      paddingLeft: '1.5em',
    },
    menuItem,
    select: {
      '& .MuiSelect-icon': {
        color: theme.palette.text.primary,
        fontSize: '1.25rem',
      },
    },
    formControl: {
      width: '100%',
      '& > .MuiInputLabel-shrink': { display: 'none' },
      '& > .MuiInput-root': { margin: 0 },
      '& label': {
        textTransform: 'uppercase',
        letterSpacing: '3px',
        fontSize: '11px',
        position: 'absolute',
        top: '-13px',
      },
    },
  };
});

export enum MapInteraction {
  GoTo = 'goto',
}

type BoundaryDropdownProps = {
  labelText: string;
  interaction: MapInteraction;
};

const BoundaryDropdown = ({
  labelText,
  interaction,
}: BoundaryDropdownProps) => {
  const boundaryLayer = getBoundaryLayerSingleton();
  const [selected, setSelected] = useState();
  const [search, setSearch] = useState('');

  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const map = useSelector(mapSelector);

  const { i18n: i18nLocale } = useSafeTranslation();
  const locationLevelNames = isEnglishLanguageSelected(i18nLocale)
    ? boundaryLayer.adminLevelNames
    : boundaryLayer.adminLevelLocalNames;

  const boundaryRelationData = useMemo(
    () =>
      boundaryLayerData &&
      boundaryLayer &&
      loadBoundaryDropdownData(boundaryLayerData.data, locationLevelNames),
    [boundaryLayerData, boundaryLayer, locationLevelNames],
  );

  const styles = useStyles();

  const displayedOptions = useMemo(() => {
    if (!boundaryRelationData) {
      return undefined;
    }

    const { levels, relations } = boundaryRelationData;

    const relationsFilter = relations.filter(rel =>
      containsText(rel.name, search),
    );

    const relationsReduced = relationsFilter
      .reduce((acc, match) => {
        if (!match.parent) {
          return [...acc, match];
        }

        // Check if element has been already included.
        if (
          acc.find(rel => rel.name === match.name && rel.level === match.level)
        ) {
          return acc;
        }

        // Get all relations that have same parent and level.
        const matchParent = relationsFilter.filter(
          rel => rel.parent === match.parent && rel.level === match.level,
        );

        const getmatchedParents = getParentRelation(
          relations,
          match.parent,
          match.level - 1,
        );

        const mergedRelations = [...getmatchedParents, ...matchParent];

        return [...acc, ...mergedRelations];
      }, [] as BoundaryRelation[])
      .reduce((acc, item) => {
        if (
          acc.find(elem => elem.name === item.name && elem.level === item.level)
        ) {
          return acc;
        }

        return [...acc, item];
      }, [] as BoundaryRelation[]);

    const relationsToRender = search === '' ? relations : relationsReduced;

    return relationsToRender.map(item => (
      <MenuItem
        className={setMenuItemStyle(item.level, levels, styles)}
        value={item.bbox.join(',')}
      >
        {item.name}
      </MenuItem>
    ));
  }, [search, boundaryRelationData, styles]);

  if (!boundaryRelationData || !map) {
    return null;
  }

  const handleChange = (event: any) => {
    setSelected(event.target.value);

    switch (interaction) {
      case MapInteraction.GoTo:
        map.fitBounds(
          event.target.value.split(',').map((l: string) => Number(l)),
          { padding: 30 },
        );
        break;
      default:
        break;
    }
  };

  return (
    <FormControl className={styles.formControl}>
      <InputLabel id="boundary-dropdown">{labelText}</InputLabel>
      <Select
        // Disables auto focus on MenuItems and allows TextField to be in focus
        MenuProps={{ autoFocus: false }}
        labelId="boundary-dropdown"
        id="select-dropdown"
        value={selected}
        onChange={handleChange}
        className={styles.select}
        onClose={() => setSearch('')}
      >
        <SearchBar setSearch={setSearch} />
        {displayedOptions}
      </Select>
    </FormControl>
  );
};

export default BoundaryDropdown;
