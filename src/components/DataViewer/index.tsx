import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  createStyles,
  Dialog,
  DialogTitle,
  Theme,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { DatasetSelector } from '../../context/chartDataStateSlice';
import Chart from '../DataDrawer/Chart';
import { ChartConfig } from '../../config/types';

function DataViewer({ classes }: DatasetProps) {
  const dataset = useSelector(DatasetSelector);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dataset) {
      setOpen(true);
    }
  }, [dataset]);

  if (!dataset) {
    return null;
  }

  const config: ChartConfig = {
    type: 'line',
    stacked: false,
    fill: false,
    category: 'Admin2_Code',
  };

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      aria-labelledby="dialog-preview"
    >
      <DialogTitle className={classes.title} id="dialog-preview">
        Data Viewer
      </DialogTitle>
      <div className={classes.modal}>
        <Chart title="Example plot" config={config} data={dataset} />
      </div>
    </Dialog>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    modal: {
      width: '50vw',
      height: '50vh',
    },
    title: {
      color: theme.palette.text.secondary,
    },
  });

export interface DatasetProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(DataViewer);
