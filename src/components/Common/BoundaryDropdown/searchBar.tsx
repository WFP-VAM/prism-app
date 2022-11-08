import React from 'react';
import { Search } from '@material-ui/icons';
import {
  TextField,
  InputAdornment,
  ListSubheader,
  makeStyles,
  Theme,
} from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) => ({
  searchField: {
    '&>div': {
      color: theme.palette.primary.main,
    },
  },
}));

type SearchBarProps = {
  setSearch: (val: string) => void;
};

const SearchBar = ({ setSearch }: SearchBarProps) => {
  const styles = useStyles();

  return (
    <ListSubheader>
      <TextField
        size="small"
        className={styles.searchField}
        autoFocus
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Escape') {
            // Prevents autoselecting item while typing (default Select behaviour)
            e.stopPropagation();
          }
        }}
      />
    </ListSubheader>
  );
};

export default SearchBar;
