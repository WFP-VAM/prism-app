import React, { useState } from 'react';
import { invert } from 'lodash';
import {
  Button,
  createStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { useDispatch } from 'react-redux';
import {
  AnalysisResult,
  TableRow as AnalysisTableRow,
} from '../../../../context/analysisResultStateSlice';
import { showPopup } from '../../../../context/tooltipStateSlice';
import { AggregationOperations } from '../../../../config/types';
import { downloadCSVFromTableData } from '../../../../utils/analysis-utils';

export type Column = {
  id: keyof AnalysisTableRow;
  label: string;
  format?: (value: number) => string;
};

function AnalysisTable({ classes, analysisResult }: AnalysisTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { tableData, statistic } = analysisResult;
  const baselineLayerTitle = analysisResult.getBaselineLayer().title;

  const dispatch = useDispatch();

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const columns: Column[] = [
    {
      id: 'localName',
      label: 'Local Name',
    },
    {
      id: 'name',
      label: 'Name',
    },
    {
      id: statistic,
      label: invert(AggregationOperations)[statistic], // invert maps from computer name to display name.
      format: (value: number) => value.toLocaleString('en-US'),
    },

    {
      id: 'baselineValue',
      label: baselineLayerTitle,
      format: (value: number | string) => value.toLocaleString('en-US'),
    },
  ];
  return (
    <div>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.id} className={classes.tableHead}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(row => {
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={row.name}
                    onClick={() => {
                      // TODO if we decide to keep, add popup data?
                      if (row.coordinates) {
                        dispatch(
                          showPopup({
                            coordinates: row.coordinates,
                            locationName: row.name,
                          }),
                        );
                      }
                    }}
                    style={{ cursor: row.coordinates ? 'pointer' : 'none' }}
                  >
                    {columns.map(column => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id}>
                          {column.format && typeof value === 'number'
                            ? column.format(value)
                            : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={tableData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
      />
      <Button
        className={classes.innerAnalysisButton}
        onClick={() => downloadCSVFromTableData(analysisResult, columns)}
      >
        <Typography variant="body2">Download</Typography>
      </Button>
    </div>
  );
}

const styles = () =>
  createStyles({
    tableContainer: {
      border: '2px solid',
      width: '600px',
      maxWidth: '100vw',
    },
    tableHead: {
      backgroundColor: '#3d474a',
    },
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
    },
  });

interface AnalysisTableProps extends WithStyles<typeof styles> {
  analysisResult: AnalysisResult;
}

export default withStyles(styles)(AnalysisTable);
