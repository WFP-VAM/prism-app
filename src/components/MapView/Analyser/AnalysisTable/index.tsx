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
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { orderBy } from 'lodash';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { TableRow as AnalysisTableRow } from '../../../../context/analysisResultStateSlice';
import { showPopup } from '../../../../context/tooltipStateSlice';
import { Column } from '../../../../utils/analysis-utils';
import { isLocalLanguageChosen, safeTranslate } from '../../../../i18n';

function AnalysisTable({ classes, tableData, columns }: AnalysisTableProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t, i18n } = useTranslation();
  const filteredColumns = columns.filter(({ id }) => id !== 'localName');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<Column['id']>();
  const [isAscending, setIsAscending] = useState(true);

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
    const newIsAsc = !(sortColumn === newSortColumn && isAscending);
    setPage(0);
    setSortColumn(newSortColumn);
    setIsAscending(newIsAsc);
  };
  return (
    <div>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {filteredColumns.map(column => (
                <TableCell key={column.id} className={classes.tableHead}>
                  <TableSortLabel
                    active={sortColumn === column.id}
                    direction={
                      sortColumn === column.id && !isAscending ? 'desc' : 'asc'
                    }
                    onClick={() => handleChangeOrderBy(column.id)}
                  >
                    {safeTranslate(t, column.label)}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {orderBy(tableData, sortColumn, isAscending ? 'asc' : 'desc')
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map(row => {
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    // TODO - Use adminCode as key to guarantee unicity?
                    key={row.name}
                    onClick={() => {
                      // TODO if we decide to keep, add popup data?
                      if (row.coordinates) {
                        dispatch(
                          showPopup({
                            coordinates: row.coordinates,
                            locationName: row.name,
                            locationLocalName: row.localName,
                          }),
                        );
                      }
                    }}
                    style={{ cursor: row.coordinates ? 'pointer' : 'none' }}
                  >
                    {filteredColumns.map(column => {
                      const value =
                        column.id === 'name' && isLocalLanguageChosen(i18n)
                          ? row.localName
                          : row[column.id];
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
        labelRowsPerPage={safeTranslate(t, 'Rows Per Page')}
        labelDisplayedRows={({ from, to, count }) => {
          return `${from}–${to} ${safeTranslate(t, 'of')} ${
            count !== -1 ? count : `${safeTranslate(t, 'more than')} ${to}`
          }`;
        }}
      />
    </div>
  );
}

const styles = () =>
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
  });

interface AnalysisTableProps extends WithStyles<typeof styles> {
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(AnalysisTable);
