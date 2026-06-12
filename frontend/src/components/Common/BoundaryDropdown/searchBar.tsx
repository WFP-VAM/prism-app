import { Search } from '@mui/icons-material';
import { Box, InputAdornment, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { forwardRef, Ref } from 'react';

const containerSx = {
  padding: '0.7em',
} satisfies SxProps<Theme>;

type SearchBarProps = {
  setSearch: (val: string) => void;
};

const SearchBar = forwardRef(
  ({ setSearch }: SearchBarProps, ref: Ref<HTMLDivElement>) => {
    return (
      <Box ref={ref} sx={containerSx}>
        <TextField
          size="small"
          autoFocus
          sx={theme => ({
            '&>div': {
              color: theme.palette.primary.main,
            },
          })}
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
      </Box>
    );
  },
);

export default SearchBar;
