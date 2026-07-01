import {
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
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { hidePopup } from 'context/tooltipStateSlice';
import { useSafeTranslation } from 'i18n';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Column } from 'utils/analysis-utils';

import {
  tableBodyCellCompactSx,
  tableBodyTextCompactSx,
  tableBodyTextSx,
  tableContainerCompactSx,
  tableContainerLowZIndexSx,
  tableHeadCompactSx,
  tableHeaderTextCompactSx,
  tableHeaderTextSx,
  tableHeadSx,
  tablePaginationBackButtonSx,
  tablePaginationNextButtonSx,
  tablePaginationSx,
} from '../../leftPanelStyles';

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
    const theme = useTheme();
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
            sx={[tableHeadSx, compact && tableHeadCompactSx]}
          >
            <TableSortLabel
              active={tableSortLabelIsActive(column)}
              direction={tableSortLabelDirection(column)}
              onClick={onTableSortLabelClick(column)}
            >
              <Typography
                sx={[tableHeaderTextSx, compact && tableHeaderTextCompactSx]}
              >
                {t(column.label)}
              </Typography>
            </TableSortLabel>
          </TableCell>
        )),
      [
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
            sx={compact ? tableBodyCellCompactSx : undefined}
          >
            <Typography
              sx={[tableBodyTextSx, compact && tableBodyTextCompactSx]}
            >
              {renderedTableBodyCellValue(row[column.id], column)}
            </Typography>
          </TableCell>
        )),
      [columns, compact, renderedTableBodyCellValue],
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
          sx={{
            marginTop: '10px',
            zIndex: theme.zIndex.modal + 1,
            ...(compact ? tableContainerCompactSx : {}),
            ...(disableHighZIndex ? tableContainerLowZIndexSx : {}),
          }}
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
          sx={tablePaginationSx}
          slotProps={{
            actions: {
              nextButton: {
                sx: tablePaginationNextButtonSx,
              },
              previousButton: {
                sx: tablePaginationBackButtonSx,
              },
            },
          }}
        />
      </>
    );
  },
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
