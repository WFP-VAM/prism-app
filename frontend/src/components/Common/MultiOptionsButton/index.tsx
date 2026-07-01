import { ArrowDropDown } from '@mui/icons-material';
import {
  Button,
  Grid,
  ListItemText,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Menu from '@mui/material/Menu';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSafeTranslation } from 'i18n';
import React, { useState } from 'react';

const menuPaperSx = (theme: Theme): SxProps<Theme> => ({
  border: '1px solid #d3d4d5',
  backgroundColor: theme.palette.primary.main,
});

const buttonSx = {
  '&&': {
    marginTop: '0.4rem',
    marginBottom: '0.1rem',
    fontSize: '0.7rem',
  },
} satisfies SxProps<Theme>;

const menuItemSx = (theme: Theme): SxProps<Theme> => ({
  color: theme.palette.common.white,
});

interface IProps {
  mainLabel: string;
  options: { label: string; disabled?: boolean; onClick: () => void }[];
}

function MultiOptionsButton({ mainLabel, options }: IProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { t } = useSafeTranslation();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('md'));

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOptionClick = (onClick: () => void) => {
    onClick();
    handleClose();
  };

  return (
    <Grid>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleClick}
        sx={buttonSx}
      >
        {!smDown && <>{t(mainLabel)}</>}
        <ArrowDropDown fontSize="small" />
      </Button>
      <Menu
        id="button-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
        elevation={0}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: menuPaperSx(theme),
          },
        }}
      >
        {options.map(option => (
          <MenuItem
            key={option.label}
            disabled={option.disabled}
            onClick={() => handleOptionClick(option.onClick)}
            sx={menuItemSx(theme)}
          >
            <ListItemText primary={t(option.label)} />
          </MenuItem>
        ))}
      </Menu>
    </Grid>
  );
}

export default MultiOptionsButton;
