import {
  Button,
  Grid,
  Hidden,
  ListItemText,
  MenuItem,
  Theme,
  Typography,
  withStyles,
} from '@material-ui/core';
import Menu, { MenuProps } from '@material-ui/core/Menu';
import { ArrowDropDown } from '@material-ui/icons';
import React, { useState } from 'react';
import { useSafeTranslation } from '../../../i18n';

const StyledMenu = withStyles((theme: Theme) => ({
  paper: {
    border: '1px solid #d3d4d5',
    backgroundColor: theme.palette.primary.main,
  },
}))((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
));

const StyledMenuItem = withStyles((theme: Theme) => ({
  root: {
    color: theme.palette.common.white,
  },
}))(MenuItem);

interface IProps {
  mainLabel: string;
  options: { label: string; disabled?: boolean; onClick: () => void }[];
}

function MultiOptionsButton({ mainLabel, options }: IProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { t } = useSafeTranslation();

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
    <Grid item>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={handleClick}
      >
        <Hidden smDown>
          <Typography variant="body2">{t(mainLabel)}</Typography>
        </Hidden>
        <ArrowDropDown fontSize="small" />
      </Button>
      <StyledMenu
        id="button-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {options.map(option => (
          <StyledMenuItem
            disabled={option.disabled}
            onClick={() => handleOptionClick(option.onClick)}
          >
            <ListItemText primary={t(option.label)} />
          </StyledMenuItem>
        ))}
      </StyledMenu>
    </Grid>
  );
}

export default MultiOptionsButton;
