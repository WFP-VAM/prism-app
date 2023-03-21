import React, { useCallback, useMemo, useState } from 'react';
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

import { useDispatch } from 'react-redux';
import { orderBy } from 'lodash';
import { TableRow as AnalysisTableRow } from '../../../../../../context/analysisResultStateSlice';

import { useSafeTranslation } from '../../../../../../i18n';

import { Column } from '../../../../../../utils/analysis-utils';
import { showPopup } from '../../../../../../context/tooltipStateSlice';

function ExposureAnalysisTable({
  classes,
  tableData,
  columns,
}: ExposureAnalysisTableProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<Column['id']>();
  const [isAscending, setIsAscending] = useState(true);

  const dispatch = useDispatch();

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(+event.target.value);
      setPage(0);
    },
    [],
  );

  const handleChangeOrderBy = useCallback(
    (newSortColumn: Column['id']) => {
      const newIsAsc = !(sortColumn === newSortColumn && isAscending);
      setPage(0);
      setSortColumn(newSortColumn);
      setIsAscending(newIsAsc);
    },
    [isAscending, sortColumn],
  );

  // Whether the table sort label is active
  const tableSortLabelIsActive = useCallback(
    (column: Column) => {
      return sortColumn === column.id;
    },
    [sortColumn],
  );

  // table sort label direction
  const tableSortLabelDirection = useCallback(
    (column: Column) => {
      return sortColumn === column.id && !isAscending ? 'desc' : 'asc';
    },
    [isAscending, sortColumn],
  );

  // on table sort label click
  const onTableSortLabelClick = useCallback(
    (column: Column) => {
      return () => {
        handleChangeOrderBy(column.id);
      };
    },
    [handleChangeOrderBy],
  );

  // The rendered table header cells
  const renderedTableHeaderCells = useMemo(() => {
    return columns.map(column => {
      return (
        <TableCell key={column.id} className={classes.tableHead}>
          <TableSortLabel
            active={tableSortLabelIsActive(column)}
            direction={tableSortLabelDirection(column)}
            onClick={onTableSortLabelClick(column)}
          >
            <Typography className={classes.tableHeaderText}>
              {t(column.label)}
            </Typography>
          </TableSortLabel>
        </TableCell>
      );
    });
  }, [
    classes.tableHead,
    classes.tableHeaderText,
    columns,
    onTableSortLabelClick,
    t,
    tableSortLabelDirection,
    tableSortLabelIsActive,
  ]);

  // The rendered table body cells
  const renderedTableBodyCells = useCallback(
    (row: AnalysisTableRow) => {
      return columns.map(column => {
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
      });
    },
    [classes.tableBodyText, columns],
  );

  // The rendered table body rows
  const renderedTableBodyRows = useMemo(() => {
    return orderBy(tableData, sortColumn, isAscending ? 'asc' : 'desc')
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
            {renderedTableBodyCells(row)}
          </TableRow>
        );
      });
  }, [
    dispatch,
    isAscending,
    page,
    renderedTableBodyCells,
    rowsPerPage,
    sortColumn,
    tableData,
  ]);

  return (
    <div className={classes.exposureAnalysisTable}>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="exposure analysis table">
          <TableHead>
            <TableRow>{renderedTableHeaderCells}</TableRow>
          </TableHead>
          <TableBody className={classes.tableBody}>
            {renderedTableBodyRows}
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
    exposureAnalysisTable: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      maxHeight: 'inherit',
    },
    tableContainer: {
      maxWidth: '90%',
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableBody: {
      padding: '8px',
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
      overflow: 'unset',
    },
    select: {
      flex: '1 1 10%',
      marginRight: 0,
    },
    caption: {
      flex: '1 2 40%',
      fontSize: '0.5rem',
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

interface ExposureAnalysisTableProps extends WithStyles<typeof styles> {
  maxResults: number;
  tableData: AnalysisTableRow[];
  columns: Column[];
}

export default withStyles(styles)(ExposureAnalysisTable);
