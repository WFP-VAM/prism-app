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
  const legendText = data.getStatTitle();
  const { features } = data.featureCollection;
  const featureProperties = features.map(feature => {
    return { name: feature.properties?.TS, value: feature.properties?.label };
  });

  type RowType = {
    name: string;
    value: string[];
  }[];

  const tableData: RowType = Object.entries(
    _.mapValues(_.groupBy(featureProperties, 'name'), properties =>
      properties.map(prop => prop.value),
    ),
  ).map(feature => ({ name: feature[0], value: feature[1] }));

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
                    '60 km/h exposure',
                    '90 km/h exposure',
                    '120 km/h exposure',
                    'Total',
                  ]}
                />
              </TableHead>
              <TableBody>
                {tableData.slice(1, maxResults).map((rowData, idx) => (
                  <TableRow
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className={classes.tableCells}
                  >
                    <TableCell className={classes.tableCells}>
                      {rowData.name}
                    </TableCell>
                    <TableCell className={classes.tableCells}>
                      {rowData.value[0]}
                    </TableCell>
                    <TableCell className={classes.tableCells}>
                      {rowData.value[1] || '-'}
                    </TableCell>
                    <TableCell className={classes.tableCells}>
                      {rowData.value[2] || '-'}
                    </TableCell>
                    <TableCell className={classes.tableCells}>
                      {rowData.value[3] || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </div>
  );
};

export default withStyles(styles)(DataTable);
