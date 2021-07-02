import _ from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableContainer,
  TableRow,
  TableCell,
  TableHead,
  withStyles,
  WithStyles,
  createStyles,
  CircularProgress,
  Paper,
  Box,
} from '@material-ui/core';
import {
  isAnalysisLoadingSelector,
  analysisResultSelector,
} from '../../../context/analysisResultStateSlice';
import DataTableRow from './DataTableRow';

const styles = () =>
  createStyles({
    root: {
      width: '100%',
      height: '100%',
      color: 'black',
    },
    container: {
      height: '100%',
      maxHeight: '100%',
    },
    headCells: {
      color: 'black',
    },
    tableCells: {
      color: 'darkGrey',
    },
  });

export interface DataTableProps extends WithStyles<typeof styles> {
  maxResults: number;
}

const DataTable = ({ classes, maxResults }: DataTableProps) => {
  const loading = useSelector(isAnalysisLoadingSelector);
  const data = useSelector(analysisResultSelector);

  if (!data) {
    return null;
  }

  const title = data.getTitle();
  const { legendText } = data;
  const { features } = data.featureCollection;
  const featureProperties = features.map(feature => {
    return {
      name: feature.properties?.TS,
      speed: feature.properties?.label,
      sum: feature.properties?.sum,
    };
  });

  type RowType = {
    name: string;
    value: number[];
    total: number;
  }[];

  const tableData: RowType = Object.entries(
    _.mapValues(_.groupBy(featureProperties, 'name'), properties =>
      properties.map(prop => prop.sum || 0),
    ),
  ).map(feature => ({
    name: feature[0],
    value: feature[1],
    total: feature[1].reduce((a, b) => a + b),
  }));

  console.log('--> ', tableData);

  return (
    <div>
      <h2>{title}</h2>
      <p>{legendText}</p>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height={300}
        >
          <CircularProgress size={40} color="secondary" />
        </Box>
      ) : (
        <Paper className={classes.root}>
          <TableContainer className={classes.container}>
            <Table stickyHeader aria-label={`table showing ${title}`}>
              <TableHead>
                <DataTableRow
                  className={classes.headCells}
                  columns={[
                    'Township',
                    '60 km/h',
                    '90 km/h',
                    '120 km/h',
                    'Total',
                  ]}
                />
              </TableHead>
              <TableBody>
                {tableData.slice(1, maxResults).map((rowData, idx) => {
                  const first = (rowData.value[0] || 0).toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 0 },
                  );
                  const second = (rowData.value[1] || 0).toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 0 },
                  );
                  const third = (rowData.value[2] || 0).toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 0 },
                  );
                  const fourth = (rowData.total || 0).toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  });
                  return (
                    <TableRow
                      // eslint-disable-next-line react/no-array-index-key
                      key={idx}
                      className={classes.tableCells}
                    >
                      <TableCell className={classes.tableCells}>
                        {rowData.name}
                      </TableCell>
                      <TableCell className={classes.tableCells}>
                        {first}
                      </TableCell>
                      <TableCell className={classes.tableCells}>
                        {second}
                      </TableCell>
                      <TableCell className={classes.tableCells}>
                        {third}
                      </TableCell>
                      <TableCell className={classes.tableCells}>
                        {fourth}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </div>
  );
};

export default withStyles(styles)(DataTable);
