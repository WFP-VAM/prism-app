import React from 'react';
import { Switch, Typography, withStyles } from '@material-ui/core';

import { ILayer } from '../../utils';

export interface ICategoryProps extends ILayer {
  classes: { [key: string]: string };
}

function Category({ classes, title, layers }: ICategoryProps) {
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

const styles: any = () => ({
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

export default withStyles(styles)(Category);
