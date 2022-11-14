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
import SearchBar from './searchBar';
import { setMenuItemStyle, containsText, createMatchesTree } from './utils';

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
  const [selected, setSelected] = useState();
  const [search, setSearch] = useState('');
  const boundaryRelationData = useSelector(relationSelector);

  const map = useSelector(mapSelector);

  const styles = useStyles();

  const displayedOptions = useMemo(() => {
    if (!boundaryRelationData) {
      return undefined;
    }

    const { levels, relations } = boundaryRelationData;

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
