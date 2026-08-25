import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Theme,
} from '@mui/material';
import type { SxProps } from '@mui/material/styles';
import {
  boundaryRelationSelector,
  mapSelector,
} from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { uniq } from 'lodash';
import { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import SearchBar from './searchBar';
import {
  containsText,
  createMatchesTree,
  getMenuItemSx,
  MapInteraction,
} from './utils';

const headerSx = {
  textTransform: 'uppercase',
  letterSpacing: '3px',
  fontSize: '0.7em',
} satisfies SxProps<Theme>;

const subHeaderSx = {
  paddingLeft: '2em',
} satisfies SxProps<Theme>;

const menuItemSx = {
  paddingLeft: '2.8em',
  fontSize: '0.9em',
} satisfies SxProps<Theme>;

const menuItemStyles = {
  header: headerSx,
  subHeader: subHeaderSx,
  menuItem: menuItemSx,
};

const formControlSx = (theme: Theme) => ({
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
  '& .MuiSelect-icon': {
    color: theme.palette.text.primary,
    fontSize: '1.25rem',
  },
});

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
          sx={getMenuItemSx(
            item.level,
            levelsRelations?.levels,
            menuItemStyles,
          )}
          value={item.bbox.join(',')}
        >
          {item.name}
        </MenuItem>
      ));
    }, [levelsRelations, relationsToRender]);

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
        <FormControl sx={formControlSx}>
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
    ]);
  },
);

export default BoundaryDropdown;
