import React from 'react';
import {
  createStyles,
  WithStyles,
  withStyles,
  Theme,
  Paper,
  Grid,
  Typography,
  Divider,
  List,
  ListItem,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

import ColorIndicator from './ColorIndicator';
import { LayerType } from '../../../config/types';

function Legends({ classes, layers }: LegendsProps) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className={classes.container}>
      <button type="button" onClick={() => setOpen(!open)}>
        <FontAwesomeIcon icon={open ? faEyeSlash : faEye} /> Legend
      </button>

      {open && (
        <List className={classes.list}>
          {layers.map(({ title, legend, legendText }) => (
            <ListItem key={title} disableGutters dense>
              <Paper className={classes.paper}>
                <Grid container direction="column" spacing={1}>
                  <Grid item>
                    <Typography variant="h4">{title}</Typography>
                  </Grid>

                  <Divider />

                  {legend && (
                    <Grid item>
                      {legend.map(({ value, color }: any) => (
                        <ColorIndicator
                          key={value}
                          value={value as string}
                          color={color as string}
                        />
                      ))}
                    </Grid>
                  )}

                  <Divider />

                  {legendText && (
                    <Grid item>
                      <Typography variant="h5">{legendText}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    container: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: 24,
      right: 24,
      textAlign: 'right',
    },
    list: {
      overflow: 'auto',
      maxHeight: '70vh',
    },
    paper: {
      padding: 8,
      width: 180,
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  layers: LayerType[];
}

export default withStyles(styles)(Legends);
