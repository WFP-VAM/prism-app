import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { Column } from 'utils/analysis-utils';
import { useSafeTranslation } from 'i18n';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { hidePopup } from 'context/tooltipStateSlice';

const AnalysisTable = memo(
  ({
    classes,
    tableData,
    columns,
    sortColumn,
    isAscending,
    handleChangeOrderBy,
  }: AnalysisTableProps) => {
    // only display local names if local language is selected, otherwise display english name
    const { t } = useSafeTranslation();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const map = useSelector(mapSelector);

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

    // Whether the table sort label is active
    const tableSortLabelIsActive = useCallback(
      (column: Column) => sortColumn === column.id,
      [sortColumn],
    );

    // table sort label direction
    const tableSortLabelDirection = useCallback(
      (column: Column) =>
        sortColumn === column.id && !isAscending ? 'desc' : 'asc',
      [isAscending, sortColumn],
    );

    // on table sort label click
    const onTableSortLabelClick = useCallback(
      (column: Column) => () => {
        handleChangeOrderBy(column.id);
      },
      [handleChangeOrderBy],
    );

    const renderedTableHeaderCells = useMemo(
      () =>
        columns.map(column => (
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
        )),
      [
        classes.tableHead,
        classes.tableHeaderText,
        columns,
        onTableSortLabelClick,
        t,
        tableSortLabelDirection,
        tableSortLabelIsActive,
      ],
    );

    const handleClickTableBodyRow = useCallback(
      row => async () => {
        if (!row.coordinates || !map) {
          return;
        }
        await dispatch(hidePopup());
        map.fire('click', {
          lngLat: row.coordinates,
          point: map.project(row.coordinates),
        });
      },
      [dispatch, map],
    );

    const renderedTableRowStyles = useCallback(
      (row: AnalysisTableRow, index: number) => ({
        cursor: row.coordinates ? 'pointer' : 'default',
        backgroundColor: index % 2 === 0 ? 'white' : '#EBEBEB',
      }),
      [],
    );

    const renderedTableBodyCellValue = useCallback(
      (value: string | number, column: Column) => {
        if (column.format && typeof value === 'number') {
          return column.format(value);
        }
        return value;
      },
      [],
    );

    const renderedTableBodyCells = useCallback(
      (row: AnalysisTableRow) =>
        columns.map(column => (
          <TableCell key={column.id}>
            <Typography className={classes.tableBodyText}>
              {renderedTableBodyCellValue(row[column.id], column)}
            </Typography>
          </TableCell>
        )),
      [classes.tableBodyText, columns, renderedTableBodyCellValue],
    );

    const renderedTableBodyRows = useMemo(
      () =>
        tableData
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((row, index) => (
            <TableRow
              hover
              role="checkbox"
              tabIndex={-1}
              key={row.key}
              onClick={handleClickTableBodyRow(row)}
              style={renderedTableRowStyles(row, index)}
            >
              {renderedTableBodyCells(row)}
            </TableRow>
          )),
      [
        handleClickTableBodyRow,
        page,
        renderedTableBodyCells,
        renderedTableRowStyles,
        rowsPerPage,
        tableData,
      ],
    );

    return (
      <>
        <TableContainer className={classes.tableContainer}>
          <Table stickyHeader aria-label="analysis table">
            <TableHead>
              <TableRow>{renderedTableHeaderCells}</TableRow>
            </TableHead>
            <TableBody>{renderedTableBodyRows}</TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={tableData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('Rows Per Page')}
          // Temporary manual translation before we upgrade to MUI 5.
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} ${t('of')} ${
              count !== -1 ? count : `${t('more than')} ${to}`
            }`
          }
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
      </>
    );
  },
);

const styles = (theme: Theme) =>
  createStyles({
    tableContainer: {
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
      flexShrink: 0,
    },
    select: {
      flex: '1 1 10%',
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
  sortColumn: string | number | undefined;
  isAscending: boolean;
  handleChangeOrderBy: (newAnalysisColumn: Column['id']) => void;
}

export default withStyles(styles)(AnalysisTable);
