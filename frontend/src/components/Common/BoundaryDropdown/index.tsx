import { useState, useMemo, useCallback, memo } from 'react';
import { makeStyles } from '@mui/styles';
import {FormControl,
  InputLabel,
  MenuItem,
  Select,
  Theme} from '@mui/material';
import { useSelector } from 'react-redux';
import { uniq } from 'lodash';
import {
  mapSelector,
  boundaryRelationSelector,
} from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';

import SearchBar from './searchBar';
import {
  setMenuItemStyle,
  containsText,
  createMatchesTree,
  MapInteraction,
} from './utils';

const useStyles = makeStyles((theme: Theme) => ({
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
}));

type BoundaryDropdownProps = {
  labelText: string;
  interaction: MapInteraction;
};

const BoundaryDropdown = memo(
  ({ labelText, interaction }: BoundaryDropdownProps) => {
    const [selected, setSelected] = useState();
    const [search, setSearch] = useState('');
    const boundaryRelationDataDict = useSelector(boundaryRelationSelector);

    const map = useSelector(mapSelector);
    const { i18n: i18nLocale } = useSafeTranslation();

    const styles = useStyles();

    const levelsRelations = useMemo(
      () => boundaryRelationDataDict[i18nLocale.language],
      [boundaryRelationDataDict, i18nLocale.language],
    );

    const relationsToRender = useMemo(() => {
      if (
        !Object.keys(boundaryRelationDataDict).includes(i18nLocale.language)
      ) {
        return undefined;
      }

      const relationsFiltered = levelsRelations?.relations.filter(rel => {
        if (!rel.name) {
          console.warn(
            `The boundary polygon ${rel} is misconfigured and has no "name" attribute.`,
          );
          return false;
        }
        return containsText(rel.name, search);
      });

      const relations =
        relationsFiltered.length === levelsRelations?.relations.length
          ? levelsRelations?.relations
          : createMatchesTree(levelsRelations?.relations, relationsFiltered);

      return uniq(relations);
    }, [
      boundaryRelationDataDict,
      i18nLocale.language,
      levelsRelations,
      search,
    ]);

    const displayedOptions = useMemo(() => {
      if (!relationsToRender) {
        return null;
      }

      return relationsToRender.map(item => (
        <MenuItem
          key={`${item.name}-${item.parent}-${item.level}`}
          className={setMenuItemStyle(
            item.level,
            levelsRelations?.levels,
            styles,
          )}
          value={item.bbox.join(',')}
        >
          {item.name}
        </MenuItem>
      ));
    }, [levelsRelations, relationsToRender, styles]);

    const handleChange = useCallback(
      (event: any) => {
        if (!map) {
          return;
        }
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
      },
      [interaction, map],
    );

    return useMemo(() => {
      if (!boundaryRelationDataDict || !map) {
        return null;
      }
      return (
        <FormControl className={styles.formControl}>
          <InputLabel id="boundary-dropdown">{labelText}</InputLabel>
          <Select
            // Disables auto focus on MenuItems and allows search bar to be in focus
            MenuProps={{
              autoFocus: false,
              style: {
                maxHeight: '50vh',
              },
            }}
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
    }, [
      boundaryRelationDataDict,
      displayedOptions,
      handleChange,
      labelText,
      map,
      selected,
      styles.formControl,
      styles.select,
    ]);
  },
);

export default BoundaryDropdown;
