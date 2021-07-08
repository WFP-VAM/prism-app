import React from 'react';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  withStyles,
  WithStyles,
  createStyles,
  CircularProgress,
  Paper,
  Box,
} from '@material-ui/core';
import {
  getCurrentDefinition as getTableDefinition,
  isLoading,
  getCurrentData as getTableData,
} from '../../../context/tableStateSlice';
import {
  getCurrentDefinition as getAnalysisDefinition,
  isExposureAnalysisLoadingSelector,
  getCurrentData as getAnalysisData,
} from '../../../context/analysisResultStateSlice';
import Chart from '../Chart';
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
  const tableLoading = useSelector(isLoading);
  const analysisLoading = useSelector(isExposureAnalysisLoadingSelector);
  const loading = tableLoading || analysisLoading;
  const tableDefinition = useSelector(getTableDefinition);
  const analysisDefinition = useSelector(getAnalysisDefinition);
  const definition = tableDefinition || analysisDefinition;
  const tableData = useSelector(getTableData);
  const analysisData = useSelector(getAnalysisData);
  const data = tableData.rows.length !== 0 ? tableData : analysisData;

  if (!definition) {
    return null;
  }

  const { table, title, legendText, chart } = definition;

  return (
    <div>
      <h2>{title}</h2>
      <p>{legendText}</p>

      {table && (
        <p>
          <a href={process.env.PUBLIC_URL + table}>Download as CSV</a>
        </p>
      )}

      {!loading && chart && <Chart title={title} config={chart} data={data} />}

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
                  columns={data.columns}
                  rowData={data.rows[0]}
                />
              </TableHead>
              <TableBody>
                {data.rows.slice(1, maxResults).map((rowData, idx) => (
                  <DataTableRow
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className={classes.tableCells}
                    columns={data.columns}
                    rowData={rowData}
                  />
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
