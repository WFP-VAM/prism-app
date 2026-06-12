import { Search } from '@mui/icons-material';
import { InputAdornment, TextField, Theme } from '@mui/material';
import makeStyles from '@mui/styles/makeStyles';
import { forwardRef, Ref } from 'react';

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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
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
