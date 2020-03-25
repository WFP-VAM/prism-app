import React, { useState, useRef } from 'react';
import {
  Button,
  Typography,
  Popper,
  ClickAwayListener,
  Paper,
  withStyles,
  WithStyles,
  createStyles,
  Theme,
} from '@material-ui/core';

import Category from './Category/Category';
import { CategoryType } from '../../../config/types';

function MenuItem({ classes, title, icon, layersList }: MenuItemProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<any>();

  return (
    <>
      <Button
        ref={anchorRef}
        className={classes.title}
        onClick={() => setOpen(prevOpen => !prevOpen)}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
      >
        <img className={classes.icon} src={icon} alt={title} />
        <Typography variant="body2">{title}</Typography>
      </Button>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        className={classes.popper}
        placement="bottom-start"
        transition
        disablePortal
      >
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <Paper className={classes.paper}>
            {layersList.map(layers => (
              <Category key={layers.title} {...layers} />
            ))}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

const styles = (theme: Theme) =>
  createStyles({
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

    popper: {
      marginTop: 8,
    },

    paper: {
      padding: '8px 16px',
      backgroundColor: `${theme.palette.primary.main}f9`,
      borderRadius: 4,
    },
  });

export interface MenuItemProps
  extends CategoryType,
    WithStyles<typeof styles> {}

export default withStyles(styles)(MenuItem);
