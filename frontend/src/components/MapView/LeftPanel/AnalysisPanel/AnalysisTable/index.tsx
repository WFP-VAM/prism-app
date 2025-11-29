import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import {
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
} from '@mui/material';
import { useDispatch, useSelector } from 'context/hooks';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { Column } from 'utils/analysis-utils';
import { useSafeTranslation } from 'i18n';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { hidePopup } from 'context/tooltipStateSlice';

const AnalysisTable = memo(
  ({
    tableData,
    columns,
    sortColumn,
    isAscending,
    handleChangeOrderBy,
    compact = false,
    maxRows,
    disableHighZIndex = false,
  }: AnalysisTableProps) => {
    // only display local names if local language is selected, otherwise display english name
    const { t } = useSafeTranslation();
    const classes = useStyles();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(maxRows ?? 10);
    const map = useSelector(mapSelector);

    const dispatch = useDispatch();

    useEffect(() => {
      setRowsPerPage(maxRows ?? 10);
    }, [maxRows]);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
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
          <TableCell
            key={column.id}
            className={`${classes.tableHead} ${compact ? classes.tableHeadCompact : ''}`}
          >
            <TableSortLabel
              active={tableSortLabelIsActive(column)}
              direction={tableSortLabelDirection(column)}
              onClick={onTableSortLabelClick(column)}
            >
              <Typography
                className={`${classes.tableHeaderText} ${compact ? classes.tableHeaderTextCompact : ''}`}
              >
                {t(column.label)}
              </Typography>
            </TableSortLabel>
          </TableCell>
        )),
      [
        classes.tableHead,
        classes.tableHeadCompact,
        classes.tableHeaderText,
        classes.tableHeaderTextCompact,
        columns,
        compact,
        onTableSortLabelClick,
        t,
        tableSortLabelDirection,
        tableSortLabelIsActive,
      ],
    );

    const handleClickTableBodyRow = useCallback(
      (row: any) => async () => {
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
          <TableCell
            key={column.id}
            className={`${classes.tableBodyCell} ${compact ? classes.tableBodyCellCompact : ''}`}
          >
            <Typography
              className={`${classes.tableBodyText} ${compact ? classes.tableBodyTextCompact : ''}`}
            >
              {renderedTableBodyCellValue(row[column.id], column)}
            </Typography>
          </TableCell>
        )),
      [
        classes.tableBodyCell,
        classes.tableBodyCellCompact,
        classes.tableBodyText,
        classes.tableBodyTextCompact,
        columns,
        compact,
        renderedTableBodyCellValue,
      ],
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
        <TableContainer
          className={`${classes.tableContainer} ${compact ? classes.tableContainerCompact : ''} ${disableHighZIndex ? classes.tableContainerLowZIndex : ''}`}
        >
          <Table stickyHeader aria-label="analysis table">
            <TableHead>
              <TableRow>{renderedTableHeaderCells}</TableRow>
            </TableHead>
            <TableBody>{renderedTableBodyRows}</TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={maxRows !== undefined ? [] : [10, 25, 100]}
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
            root: compact
              ? classes.tablePaginationCompact
              : classes.tablePagination,
          }}
          slotProps={{
            actions: {
              nextButton: {
                className: classes.nextButton,
              },
              previousButton: {
                className: classes.backButton,
              },
            },
          }}
        />
      </>
    );
  },
);

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    tableContainer: {
      marginTop: 10,
      zIndex: theme.zIndex.modal + 1,
    },
    tableContainerCompact: {
      marginTop: 0,
      backgroundColor: 'white',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: 'none',
      border: `1px solid ${theme.palette.divider}`,
    },
    tableContainerLowZIndex: {
      zIndex: 'auto !important' as any,
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeadCompact: {
      backgroundColor: `${theme.palette.divider} !important`,
      boxShadow: 'none !important',
      padding: '4px 8px !important',
      border: 'none !important',
      borderBottom: `1px solid ${theme.palette.divider} !important`,
      '&:first-child': {
        paddingLeft: '16px !important',
      },
      '&:last-child': {
        paddingRight: '16px !important',
      },
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableHeaderTextCompact: {
      fontWeight: '600 !important' as any,
      fontSize: '14px !important',
    },
    tableBodyCell: {},
    tableBodyCellCompact: {
      padding: '4px !important',
      border: 'none !important',
      '&:first-child': {
        paddingLeft: '16px !important',
      },
      '&:last-child': {
        paddingRight: '16px !important',
      },
    },
    tableBodyText: {
      color: 'black',
    },
    tableBodyTextCompact: {
      fontSize: '14px !important',
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
    tablePaginationCompact: {
      color: 'black',
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
    },
    nextButton: {
      flex: '1 1 5%',
    },
    spacer: {
      flex: '1 1 5%',
      maxWidth: '5%',
    },
  }),
);

interface AnalysisTableProps {
  tableData: AnalysisTableRow[];
  columns: Column[];
  sortColumn: string | number | undefined;
  isAscending: boolean;
  handleChangeOrderBy: (newAnalysisColumn: Column['id']) => void;
  compact?: boolean;
  disableHighZIndex?: boolean;
  maxRows?: number;
}

export default AnalysisTable;
