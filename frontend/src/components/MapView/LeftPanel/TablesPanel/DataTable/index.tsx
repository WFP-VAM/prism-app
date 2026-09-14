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
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Chart from 'components/Common/Chart';
import LoadingBlinkingDots from 'components/Common/LoadingBlinkingDots';
import { ChartConfig } from 'config/types';
import { TableData, TableRowType } from 'context/tableStateSlice';
import { useSafeTranslation } from 'i18n';
import { orderBy } from 'lodash';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { getTableCellVal } from 'utils/data-utils';

import {
  dataTableChartContainerSx,
  dataTableLegendTextSx,
  dataTableLoadingContainerSx,
  dataTablePaginationSx,
  dataTableRootSx,
  dataTableTextLoadingContainerSx,
  dataTableTitleContainerSx,
  dataTableTitleTextSx,
  tableBodyTextSx,
  tableContainerSx,
  tableHeaderTextSx,
  tableHeadSx,
} from '../../leftPanelStyles';

const DataTable = memo(
  ({ title, legendText, chart, tableData, tableLoading }: DataTableProps) => {
    const theme = useTheme();
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
        <Box sx={dataTableChartContainerSx}>
          <Chart
            notMaintainAspectRatio
            title={t(renderedTitle)}
            config={chart}
            data={tableData}
          />
        </Box>
      );
    }, [chart, renderedTitle, t, tableData]);

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
            <TableCell key={column} sx={tableHeadSx}>
              <TableSortLabel
                active={tableSortLabelIsActive(column)}
                direction={tableSortLabelDirection(column)}
                onClick={onTableSortLabelClick(column)}
              >
                <Typography sx={tableHeaderTextSx}>
                  {formattedColValue}
                </Typography>
              </TableSortLabel>
            </TableCell>
          );
        }),
      [
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
              <Typography sx={tableBodyTextSx}>{formattedColValue}</Typography>
            </TableCell>
          );
        }),
      [columns, t],
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
          <TableContainer sx={tableContainerSx(theme)}>
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
            sx={dataTablePaginationSx}
          />
        </>
      );
    }, [
      handleChangePage,
      handleChangeRowsPerPage,
      page,
      renderedTableBodyRows,
      renderedTableHeaderCells,
      rows.length,
      rowsPerPage,
      t,
      tableData,
      theme,
    ]);

    const renderedChartTableContent = useMemo(() => {
      if (tableLoading) {
        return (
          <Box sx={dataTableLoadingContainerSx}>
            <CircularProgress size={100} color="primary" />
            <Box sx={dataTableTextLoadingContainerSx}>
              <Typography
                variant="body1"
                color="textSecondary"
                component="span"
              >
                {t('Loading DataTable')}
              </Typography>
              <LoadingBlinkingDots />
            </Box>
          </Box>
        );
      }
      return (
        <>
          {renderedChart}
          {renderedTable}
        </>
      );
    }, [renderedChart, renderedTable, t, tableLoading]);

    return (
      <Box sx={dataTableRootSx}>
        <Box sx={dataTableTitleContainerSx}>
          <Typography
            color="textSecondary"
            variant="h3"
            component="h2"
            sx={dataTableTitleTextSx}
          >
            {t(renderedTitle)}
          </Typography>
          <Typography
            color="textSecondary"
            variant="body2"
            component="p"
            sx={dataTableLegendTextSx}
          >
            {t(renderedLegendText)}
          </Typography>
        </Box>
        {renderedChartTableContent}
      </Box>
    );
  },
);

interface DataTableProps {
  title?: string;
  legendText?: string;
  chart?: ChartConfig;
  tableData: TableData;
  tableLoading: boolean;
}

export default DataTable;
