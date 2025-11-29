import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createStyles, makeStyles } from '@mui/styles';
import {
  Box,
  CircularProgress,
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
import { orderBy } from 'lodash';
import { useSafeTranslation } from 'i18n';
import { ChartConfig } from 'config/types';
import { TableData, TableRowType } from 'context/tableStateSlice';
import Chart from 'components/Common/Chart';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { getTableCellVal } from 'utils/data-utils';

const DataTable = memo(
  ({ title, legendText, chart, tableData, tableLoading }: DataTableProps) => {
    const classes = useStyles();
    const { t } = useSafeTranslation();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isAscending, setIsAscending] = useState<boolean>(true);

    const rows = useMemo(() => tableData.rows, [tableData.rows]);

    const tableRowsToRender = useMemo(() => rows.slice(1), [rows]);

    const columns = useMemo(() => tableData.columns, [tableData.columns]);

    // defaults to the first item of the columns collection
    const [sortColumn, setSortColumn] = useState<string>(columns[0]);

    useEffect(() => {
      setSortColumn(columns[0]);
    }, [columns]);

    const sortedTableRowsToRender = useMemo(
      () =>
        orderBy(tableRowsToRender, sortColumn, isAscending ? 'asc' : 'desc'),
      [isAscending, sortColumn, tableRowsToRender],
    );

    const renderedTitle = useMemo(() => title ?? '', [title]);

    const renderedLegendText = useMemo(() => legendText ?? '', [legendText]);

    // handler of sort order
    const handleTableOrderBy = useCallback(
      (newAnalysisSortColumn: string) => {
        const newIsAsc = !(sortColumn === newAnalysisSortColumn && isAscending);
        setSortColumn(newAnalysisSortColumn);
        setIsAscending(newIsAsc);
      },
      [isAscending, sortColumn],
    );

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

    const renderedChart = useMemo(() => {
      if (!chart) {
        return null;
      }
      return (
        <Box className={classes.chartContainer}>
          <Chart
            notMaintainAspectRatio
            title={t(renderedTitle)}
            config={chart}
            data={tableData}
          />
        </Box>
      );
    }, [chart, classes.chartContainer, renderedTitle, t, tableData]);

    // Whether the table sort label is active
    const tableSortLabelIsActive = useCallback(
      (column: string) => sortColumn === column,
      [sortColumn],
    );

    // table sort label direction
    const tableSortLabelDirection = useCallback(
      (column: string) =>
        sortColumn === column && !isAscending ? 'desc' : 'asc',
      [isAscending, sortColumn],
    );

    // on table sort label click
    const onTableSortLabelClick = useCallback(
      (column: string) => () => {
        handleTableOrderBy(column);
      },
      [handleTableOrderBy],
    );

    const renderedTableHeaderCells = useMemo(
      () =>
        columns.map((column: string) => {
          const formattedColValue = getTableCellVal(rows[0], column, t);
          return (
            <TableCell key={column} className={classes.tableHead}>
              <TableSortLabel
                active={tableSortLabelIsActive(column)}
                direction={tableSortLabelDirection(column)}
                onClick={onTableSortLabelClick(column)}
              >
                <Typography className={classes.tableHeaderText}>
                  {formattedColValue}
                </Typography>
              </TableSortLabel>
            </TableCell>
          );
        }),
      [
        classes.tableHead,
        classes.tableHeaderText,
        columns,
        onTableSortLabelClick,
        rows,
        t,
        tableSortLabelDirection,
        tableSortLabelIsActive,
      ],
    );

    const renderedTableBodyCells = useCallback(
      (row: TableRowType) =>
        columns.map(column => {
          const formattedColValue = getTableCellVal(row, column, t);
          return (
            <TableCell key={column}>
              <Typography className={classes.tableBodyText}>
                {formattedColValue}
              </Typography>
            </TableCell>
          );
        }),
      [classes.tableBodyText, columns, t],
    );

    const renderedTableBodyRows = useMemo(
      () =>
        sortedTableRowsToRender
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map((row: TableRowType, rowIndex: number) => {
            const key = `TableRow-${row as unknown as string}}-${rowIndex}`;
            return <TableRow key={key}>{renderedTableBodyCells(row)}</TableRow>;
          }),
      [page, renderedTableBodyCells, rowsPerPage, sortedTableRowsToRender],
    );

    const renderedTable = useMemo(() => {
      if (!tableData) {
        return null;
      }
      return (
        <>
          <TableContainer className={classes.tableContainer}>
            <Table stickyHeader aria-label="data-table">
              <TableHead>
                <TableRow>{renderedTableHeaderCells}</TableRow>
              </TableHead>
              <TableBody>{renderedTableBodyRows}</TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={rows.length}
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
            }}
          />
        </>
      );
    }, [
      classes.tableContainer,
      classes.tablePagination,
      handleChangePage,
      handleChangeRowsPerPage,
      page,
      renderedTableBodyRows,
      renderedTableHeaderCells,
      rows.length,
      rowsPerPage,
      t,
      tableData,
    ]);

    const renderedChartTableContent = useMemo(() => {
      if (tableLoading) {
        return (
          <Box className={classes.loadingContainer}>
            <CircularProgress size={100} color="primary" />
            <div className={classes.textLoadingContainer}>
              <Typography
                variant="body1"
                color="textSecondary"
                component="span"
              >
                {t('Loading DataTable')}
              </Typography>
              <LoadingBlinkingDots />
            </div>
          </Box>
        );
      }
      return (
        <>
          {renderedChart}
          {renderedTable}
        </>
      );
    }, [
      classes.loadingContainer,
      classes.textLoadingContainer,
      renderedChart,
      renderedTable,
      t,
      tableLoading,
    ]);

    return (
      <div className={classes.dataTableRoot}>
        <div className={classes.titleContainer}>
          <Typography
            color="textSecondary"
            variant="h3"
            component="h2"
            className={classes.titleText}
          >
            {t(renderedTitle)}
          </Typography>
          <Typography
            color="textSecondary"
            variant="body2"
            component="p"
            className={classes.legendText}
          >
            {t(renderedLegendText)}
          </Typography>
        </div>
        {renderedChartTableContent}
      </div>
    );
  },
);

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dataTableRoot: {
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 5px 5px',
      width: '100%',
      overflowX: 'hidden',
    },
    titleContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleText: {
      fontSize: '2rem',
    },
    legendText: {
      fontSize: '9px',
    },
    chartContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      minHeight: '371px',
    },
    loadingContainer: {
      height: '100%',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: 10,
    },
    textLoadingContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
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
    tablePagination: {
      alignSelf: 'flex-end',
      display: 'flex',
      justifyContent: 'center',
      color: 'black',
      flexShrink: 0,
    },
  }),
);

interface DataTableProps {
  title?: string;
  legendText?: string;
  chart?: ChartConfig;
  tableData: TableData;
  tableLoading: boolean;
}

export default DataTable;
