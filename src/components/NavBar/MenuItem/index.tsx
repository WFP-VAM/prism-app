import React, { useState } from 'react';
import {
  Button,
  Box,
  ClickAwayListener,
  Grow,
  Popper,
  Typography,
  withStyles,
  WithStyles,
  createStyles,
  Theme,
} from '@material-ui/core';

import { MenuItemType } from '../../../config/types';
import MenuSwitch from '../MenuSwitch';
import { useSafeTranslation } from '../../../i18n';

function MenuItem({ classes, title, icon, layersCategories }: MenuItemProps) {
  const { t } = useSafeTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(open ? null : event.currentTarget);
  };

  const handleClickAway = () => {
    setAnchorEl(null);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway} mouseEvent="onMouseDown">
      <div className={classes.root}>
        <Button className={classes.title} onClick={handleClick}>
          <img className={classes.icon} src={`images/${icon}`} alt={title} />
          <Typography variant="body2">{t(title)}</Typography>
        </Button>
        <Popper
          open={open}
          anchorEl={anchorEl}
          className={classes.popover}
          transition
        >
          {({ TransitionProps }) => (
            <Grow
              {...TransitionProps}
              timeout={350}
              style={{ transformOrigin: '50% 0' }}
            >
              <Box className={classes.paper} boxShadow={3}>
                {layersCategories.map(
                  ({ title: categoryTitle, layers, tables }) => (
                    <MenuSwitch
                      key={categoryTitle}
                      title={t(categoryTitle)}
                      layers={layers}
                      tables={tables}
                    />
                  ),
                )}
              </Box>
            </Grow>
          )}
        </Popper>
      </div>
    </ClickAwayListener>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      position: 'relative',
      display: 'inline-flex',
    },
    title: {
      margin: '0px 14px',
      textTransform: 'uppercase',
      color: 'inherit',

      '&::after': {
        content: '""',
        display: 'inline-block',
        width: 0,
        height: 0,
        marginLeft: 3.5,
        verticalAlign: 3.5,
        borderTop: '3.5px solid',
        borderRight: '3.5px solid transparent',
        borderBottom: 0,
        borderLeft: '3.5px solid transparent',
      },
    },

    icon: {
      width: 18,
      marginRight: 6,
    },

    popover: {
      marginTop: 8,
      zIndex: 1300,
    },

    paper: {
      padding: '8px 16px',
      backgroundColor: `${theme.palette.primary.main}f9`,
      borderRadius: theme.shape.borderRadius,
    },
  });

export interface MenuItemProps
  extends MenuItemType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItem);
