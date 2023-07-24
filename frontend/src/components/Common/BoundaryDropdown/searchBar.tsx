import React, { forwardRef, Ref } from 'react';
import { Search } from '@material-ui/icons';
import {
  TextField,
  InputAdornment,
  makeStyles,
  Theme,
} from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) => ({
  searchField: {
    '&>div': {
      color: theme.palette.primary.main,
    },
  },
  container: {
    padding: '0.7em',
  },
}));

type SearchBarProps = {
  setSearch: (val: string) => void;
};

const SearchBar = forwardRef(
  ({ setSearch }: SearchBarProps, ref: Ref<HTMLDivElement>) => {
    const styles = useStyles();

    return (
      <div ref={ref} className={styles.container}>
        <TextField
          size="small"
          autoFocus
          className={styles.searchField}
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
      </div>
    );
  },
);

export default SearchBar;
