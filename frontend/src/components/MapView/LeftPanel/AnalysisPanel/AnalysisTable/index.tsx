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
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { orderBy } from 'lodash';
import { useDispatch } from 'react-redux';
import { TableRow as AnalysisTableRow } from '../../../../../context/analysisResultStateSlice';
import { showPopup } from '../../../../../context/tooltipStateSlice';
import { Column } from '../../../../../utils/analysis-utils';
import { useSafeTranslation } from '../../../../../i18n';

function AnalysisTable({ classes, tableData, columns }: AnalysisTableProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="analysis table">
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell key={column.id} className={classes.tableHead}>
                  <TableSortLabel
                    active={sortColumn === column.id}
                    direction={
                      sortColumn === column.id && !isAscending ? 'desc' : 'asc'
                    }
                    onClick={() => handleChangeOrderBy(column.id)}
                  >
                    <Typography className={classes.tableHeaderText}>
                      {t(column.label)}
                    </Typography>
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {orderBy(tableData, sortColumn, isAscending ? 'asc' : 'desc')
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => {
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={row.key}
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
                    style={{
                      cursor: row.coordinates ? 'pointer' : 'none',
                      backgroundColor: index % 2 === 0 ? 'white' : '#EBEBEB',
                    }}
                  >
                    {columns.map(column => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id}>
                          <Typography className={classes.tableBodyText}>
                            {column.format && typeof value === 'number'
                              ? column.format(value)
                              : value}
                          </Typography>
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
        labelRowsPerPage={t('Rows Per Page')}
        // Temporary manual translation before we upgrade to MUI 5.
        labelDisplayedRows={({ from, to, count }) => {
          return `${from}–${to} ${t('of')} ${
            count !== -1 ? count : `${t('more than')} ${to}`
          }`;
        }}
        classes={{
          root: classes.tablePagination,
          select: classes.select,
          caption: classes.caption,
          spacer: classes.spacer,
        }}
        nextIconButtonProps={{
          classes: {
            root: classes.nextButton,
          },
        }}
        backIconButtonProps={{
          classes: {
            root: classes.backButton,
          },
        }}
      />
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    tableContainer: {
      maxWidth: '90%',
      marginTop: 10,
      zIndex: theme.zIndex.modal + 1,
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableBodyText: {
      color: 'black',
    },
    innerAnalysisButton: {
      backgroundColor: theme.surfaces?.dark,
    },
    tablePagination: {
      display: 'flex',
      justifyContent: 'center',
      color: 'black',
    },
    select: {
      flex: '1 1 10%',
      maxWidth: '10%',
      marginRight: 0,
    },
    caption: {
      flex: '1 2 30%',
      marginLeft: 0,
    },
    backButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    nextButton: {
      flex: '1 1 5%',
      maxWidth: '10%',
    },
    spacer: {
      flex: '1 1 5%',
      maxWidth: '5%',
    },
  });

interface AnalysisTableProps extends WithStyles<typeof styles> {
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(AnalysisTable);
