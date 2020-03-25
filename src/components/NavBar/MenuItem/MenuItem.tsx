import React, { useState, useRef } from 'react';
import {
  Button,
  Typography,
  Popper,
  ClickAwayListener,
  Paper,
  withStyles,
} from '@material-ui/core';

import Category from './Category/Category';
import { ICategory } from '../utils';

export interface IMenuItemProps extends ICategory {
  classes: { [key: string]: string };
}

function MenuItem({ classes, title, icon, layersList }: IMenuItemProps) {
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

const styles: any = (theme: any) => ({
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

export default withStyles(styles)(MenuItem);
