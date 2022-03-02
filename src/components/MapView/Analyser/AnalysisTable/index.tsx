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
  TableSortLabel,
  Theme,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { orderBy } from 'lodash';
import { useDispatch } from 'react-redux';
import { TableRow as AnalysisTableRow } from '../../../../context/analysisResultStateSlice';
import { showPopup } from '../../../../context/tooltipStateSlice';
import { Column } from '../../../../utils/analysis-utils';

function AnalysisTable({ classes, tableData, columns }: AnalysisTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<Column['id']>();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleChangeOrderBy = (newSortColumn: Column['id']) => {
    const isAsc = sortColumn === newSortColumn && sortDirection === 'asc';
    setSortColumn(newSortColumn);
    setSortDirection(isAsc ? 'desc' : 'asc');
  };
  return (
    <div>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.id} className={classes.tableHead}>
                  <TableSortLabel
                    classes={{
                      root: classes.tabelSortLabelRoot,
                      icon: classes.tabelSortLabelIcon,
                    }}
                    active={sortColumn === column.id}
                    direction={sortColumn === column.id ? sortDirection : 'asc'}
                    onClick={() => handleChangeOrderBy(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {orderBy(tableData, sortColumn, sortDirection)
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
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    tableContainer: {
      border: '2px solid',
      width: '700px',
      maxWidth: '100vw',
    },
    tableHead: {
      backgroundColor: '#3d474a',
    },
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
    },
    tabelSortLabelIcon: {
      color: theme.palette.text.primary,
      opacity: 1,
      '&:hover': {
        opacity: 0.5,
      },
    },
    tabelSortLabelRoot: {
      color: theme.palette.text.primary,
      '&:hover': {
        color: theme.palette.text.primary,
        opacity: 0.5,
      },
    },
  });

interface AnalysisTableProps extends WithStyles<typeof styles> {
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(AnalysisTable);
