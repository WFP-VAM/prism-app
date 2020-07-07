/* eslint-disable no-console */
// TODO remove above
import React, { useState } from 'react';
import {
  createStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { TableRow as AnalysisTableObject } from '../../../../context/analysisResultStateSlice';
import { AggregationOperations } from '../../../../config/types';

function AnalysisTable({ classes, tableData }: AnalysisTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  type Column = {
    id: keyof AnalysisTableObject;
    label: string;
    format?: (value: number) => string;
  };
  const columns: Column[] = [
    {
      id: 'nativeName',
      label: 'Native Name',
    },
    {
      id: 'name',
      label: 'Name',
    },
    {
      id: AggregationOperations.mean,
      label: 'Mean',
      format: (value: number) => value.toLocaleString('en-US'),
    },
    {
      id: AggregationOperations.median,
      label: 'Median',
      format: (value: number) => value.toLocaleString('en-US'),
    },
    {
      id: 'baselineValue',
      label: 'Baseline Value',
      // format: (value: number | string) => value.toLocaleString('en-US'), Not needed for this one?
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
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.name}>
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
      ,
    </div>
  );
}

const styles = () =>
  createStyles({
    radioOptions: {
      color: 'white',
      padding: '2px 10px 2px 20px',
    },
    tableContainer: {
      maxHeight: '50vh',
      border: '2px solid',
    },
    tableHead: {
      backgroundColor: '#3d474a',
    },
  });

interface AnalysisTableProps extends WithStyles<typeof styles> {
  tableData: AnalysisTableObject[];
}

export default withStyles(styles)(AnalysisTable);
