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
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { hidePopup } from 'context/tooltipStateSlice';
import { useSafeTranslation } from 'i18n';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Column } from 'utils/analysis-utils';

import {
  exposureTableBodySx,
  exposureTablePaginationBackButtonSx,
  exposureTablePaginationNextButtonSx,
  exposureTablePaginationSx,
  tableBodyTextSx,
  tableHeaderTextSx,
  tableHeadSx,
} from '../../../leftPanelStyles';

const ExposureAnalysisTable = memo(
  ({
    tableData,
    columns,
    sortColumn,
    isAscending,
    handleChangeOrderBy,
  }: ExposureAnalysisTableProps) => {
    // only display local names if local language is selected, otherwise display english name
    const { t } = useSafeTranslation();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const map = useSelector(mapSelector);

    const dispatch = useDispatch();

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

    // The rendered table header cells
    const renderedTableHeaderCells = useMemo(
      () =>
        columns.map(column => (
          <TableCell key={column.id} sx={tableHeadSx}>
            <TableSortLabel
              active={tableSortLabelIsActive(column)}
              direction={tableSortLabelDirection(column)}
              onClick={onTableSortLabelClick(column)}
            >
              <Typography sx={tableHeaderTextSx}>{t(column.label)}</Typography>
            </TableSortLabel>
          </TableCell>
        )),
      [
        columns,
        onTableSortLabelClick,
        t,
        tableSortLabelDirection,
        tableSortLabelIsActive,
      ],
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

    // The rendered table body cells
    const renderedTableBodyCells = useCallback(
      (row: AnalysisTableRow) =>
        columns.map(column => (
          <TableCell key={column.id}>
            <Typography sx={tableBodyTextSx}>
              {renderedTableBodyCellValue(row[column.id], column)}
            </Typography>
          </TableCell>
        )),
      [columns, renderedTableBodyCellValue],
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

    // The rendered table body rows
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
              style={{
                cursor: row.coordinates ? 'pointer' : 'default',
                backgroundColor: index % 2 === 0 ? 'white' : '#EBEBEB',
              }}
            >
              {renderedTableBodyCells(row)}
            </TableRow>
          )),
      [
        handleClickTableBodyRow,
        page,
        renderedTableBodyCells,
        rowsPerPage,
        tableData,
      ],
    );

    return (
      <>
        <TableContainer>
          <Table stickyHeader aria-label="exposure analysis table">
            <TableHead>
              <TableRow>{renderedTableHeaderCells}</TableRow>
            </TableHead>
            <TableBody sx={exposureTableBodySx}>
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('Rows Per Page')}
          // Temporary manual translation before we upgrade to MUI 5.
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} ${t('of')} ${
              count !== -1 ? count : `${t('more than')} ${to}`
            }`
          }
          sx={exposureTablePaginationSx}
          slotProps={{
            actions: {
              nextButton: {
                sx: exposureTablePaginationNextButtonSx,
              },
              previousButton: {
                sx: exposureTablePaginationBackButtonSx,
              },
            },
          }}
        />
      </>
    );
  },
);

interface ExposureAnalysisTableProps {
  tableData: AnalysisTableRow[];
  columns: Column[];
  sortColumn: string | number | undefined;
  isAscending: boolean;
  handleChangeOrderBy: (newExposureAnalysisSortColumn: Column['id']) => void;
}

export default ExposureAnalysisTable;
