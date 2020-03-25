import React from 'react';
import {
  Switch,
  Typography,
  withStyles,
  createStyles,
  WithStyles,
} from '@material-ui/core';

import { LayerType } from '../../../../config/types';

function Category({ classes, title, layers }: CategoryProps) {
  return (
    <div className={classes.container}>
      <Typography variant="body2" className={classes.title}>
        {title}
      </Typography>
      <hr />
      {layers.map(({ id, title: layersTitle }) => (
        <div key={id} className={classes.listContainer}>
          <Switch
            size="small"
            color="default"
            inputProps={{ 'aria-label': 'checkbox with default color' }}
          />{' '}
          <Typography variant="body1">{layersTitle}</Typography>
        </div>
      ))}
    </div>
  );
}

const styles = () =>
  createStyles({
    container: {
      marginBottom: 16,
    },

    listContainer: {
      display: 'flex',
      marginBottom: 8,
    },

    title: {
      fontWeight: 'bold',
      textAlign: 'left',
    },
  });

export interface CategoryProps extends LayerType, WithStyles<typeof styles> {}

export default withStyles(styles)(Category);
