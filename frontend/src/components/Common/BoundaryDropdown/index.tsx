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
  mapSelector,
  relationSelector,
} from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';

import SearchBar from './searchBar';
import { setMenuItemStyle, containsText, createMatchesTree } from './utils';

const useStyles = makeStyles((theme: Theme) => {
  return {
    header: {
      textTransform: 'uppercase',
      letterSpacing: '3px',
      fontSize: '0.7em',
    },
    subHeader: {
      paddingLeft: '2em',
    },
    menuItem: {
      paddingLeft: '2.8em',
      fontSize: '0.9em',
    },
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
  const [selected, setSelected] = useState();
  const [search, setSearch] = useState('');
  const boundaryRelationDataDict = useSelector(relationSelector);

  const map = useSelector(mapSelector);
  const { i18n: i18nLocale } = useSafeTranslation();

  const styles = useStyles();

  const displayedOptions = useMemo(() => {
    if (!Object.keys(boundaryRelationDataDict).includes(i18nLocale.language)) {
      return undefined;
    }

    const { levels, relations } = boundaryRelationDataDict[i18nLocale.language];

    const relationsFiltered = relations.filter(rel =>
      containsText(rel.name, search),
    );

    const relationsToRender =
      relationsFiltered.length === relations.length
        ? relations
        : createMatchesTree(relations, relationsFiltered);

    return relationsToRender.map(item => (
      <MenuItem
        className={setMenuItemStyle(item.level, levels, styles)}
        value={item.bbox.join(',')}
      >
        {item.name}
      </MenuItem>
    ));
  }, [search, boundaryRelationDataDict, styles, i18nLocale.language]);

  if (!boundaryRelationDataDict || !map) {
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
        // Disables auto focus on MenuItems and allows search bar to be in focus
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
