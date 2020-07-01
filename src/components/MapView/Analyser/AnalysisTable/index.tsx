/* eslint-disable no-console */
import React from 'react';
import { Theme, createStyles, withStyles, WithStyles } from '@material-ui/core';
import { find, map } from 'lodash';

function AnalysisTable({ classes }: AnalysisTableProps) {
  return <p>Hello Table</p>;
}

const styles = (theme: Theme) => createStyles({});

interface AnalysisTableProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AnalysisTable);
