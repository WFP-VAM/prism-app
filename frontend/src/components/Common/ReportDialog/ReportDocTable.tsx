import { memo, useCallback, useMemo } from 'react';
import { Theme } from '@mui/material';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { chunk } from 'lodash';
import { getRoundedData } from 'utils/data-utils';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { Column } from 'utils/analysis-utils';
import { FIRST_PAGE_TABLE_ROWS, MAX_TABLE_ROWS_PER_PAGE } from './types';
import ReportDocTableHeader from './ReportDocTableHeader';

const createPdfStyles = (theme: Theme) =>
  StyleSheet.create({
    tableCell: {
      padding: 8,
      fontSize: theme.pdf?.fontSizes.medium,
    },
    tableRow: {
      display: 'flex',
      flexDirection: 'row',
      lineHeight: 1,
    },
    tableFooter: {
      borderTop: 1,
      borderTopColor: theme.pdf?.table?.borderColor,
      fontWeight: 700,
    },
  });

interface TableProps {
  theme: Theme;
  name: string;
  rows: AnalysisTableRow[];
  columns: Column[];
  cellWidth: string;
  showTotal: boolean;
  showRowTotal: boolean;
}

const ReportDocTable = memo(
  ({
    theme,
    name,
    rows,
    columns,
    cellWidth,
    showTotal,
    showRowTotal,
  }: TableProps) => {
    const styles = createPdfStyles(theme);

    const totals = useMemo(
      () =>
        showTotal
          ? columns.reduce<number[]>((colPrev, colCurr) => {
              const rowTotal = rows.reduce((rowPrev, rowCurr) => {
                const val = Number(rowCurr[colCurr.id]);
                if (!Number.isNaN(val)) {
                  return rowPrev + val;
                }
                return rowPrev;
              }, 0);
              return [...colPrev, rowTotal];
            }, [])
          : [],
      [columns, rows, showTotal],
    );

    const firstPageChunk = useMemo(
      () => rows.slice(0, FIRST_PAGE_TABLE_ROWS),
      [rows],
    );

    const restPagesChunks = useMemo(
      () => chunk(rows.slice(FIRST_PAGE_TABLE_ROWS), MAX_TABLE_ROWS_PER_PAGE),
      [rows],
    );

    const chunks = useMemo(
      () => [firstPageChunk, ...restPagesChunks],
      [firstPageChunk, restPagesChunks],
    );

    // the table row color
    const getTableRowColor = useCallback(
      (rowIndex: number) =>
        rowIndex % 2
          ? theme.pdf?.table?.darkRowColor
          : theme.pdf?.table?.lightRowColor,
      [theme.pdf],
    );

    // Gets the total sum of row
    const getRowTotal = useCallback(
      (rowData: AnalysisTableRow) =>
        columns.reduce((prev, curr) => {
          const val = rowData[curr.id];
          if (!Number.isNaN(Number(val))) {
            return prev + Number(val);
          }
          return prev;
        }, 0),
      [columns],
    );

    // The rendered tableCell values
    const renderedTableCellValues = useCallback(
      (rowData: AnalysisTableRow) =>
        columns.map((column: Column) => {
          const value = rowData[column.id];
          return (
            <Text
              key={column.id}
              style={[styles.tableCell, { width: cellWidth }]}
            >
              {column.format && typeof value === 'number'
                ? column.format(value)
                : value}
            </Text>
          );
        }),
      [cellWidth, columns, styles.tableCell],
    );

    // The rendered total row
    const renderedTotalRow = useCallback(
      (rowData: any) => {
        if (!showRowTotal) {
          return null;
        }
        return (
          <Text style={[styles.tableCell, { width: cellWidth }]}>
            {Number(getRowTotal(rowData)).toLocaleString('en-US')}
          </Text>
        );
      },
      [cellWidth, getRowTotal, showRowTotal, styles.tableCell],
    );

    // The rendered table row
    const renderedTableRow = useCallback(
      (tableRow: AnalysisTableRow[]) =>
        tableRow.map((rowData, index) => (
          <View
            key={rowData.key}
            style={[
              styles.tableRow,
              { backgroundColor: getTableRowColor(index) },
            ]}
            wrap={false}
          >
            {renderedTableCellValues(rowData)}
            {renderedTotalRow(rowData)}
          </View>
        )),
      [
        getTableRowColor,
        renderedTableCellValues,
        renderedTotalRow,
        styles.tableRow,
      ],
    );

    // The rendered table view
    const renderedTableView = useMemo(
      () =>
        chunks.map(chunkRow => (
          <View key={chunkRow[0].key} wrap={false}>
            <ReportDocTableHeader
              theme={theme}
              name={name}
              cellWidth={cellWidth}
              columns={columns}
              showTotalsColumn={showRowTotal}
            />
            {renderedTableRow(chunkRow)}
          </View>
        )),
      [cellWidth, chunks, columns, name, renderedTableRow, showRowTotal, theme],
    );

    // gets the total row color
    const totalRowBackgroundColor = useMemo(
      () =>
        rows.length % 2
          ? theme.pdf?.table?.darkRowColor
          : theme.pdf?.table?.lightRowColor,
      [rows.length, theme.pdf],
    );

    // The total row
    const totalRow = useMemo(
      () =>
        totals.map((val, index) => {
          if (index === 0) {
            return (
              <Text key={val} style={[styles.tableCell, { width: cellWidth }]}>
                Total
              </Text>
            );
          }
          return (
            <Text key={val} style={[styles.tableCell, { width: cellWidth }]}>
              {getRoundedData(val)}
            </Text>
          );
        }),
      [cellWidth, styles.tableCell, totals],
    );

    const totalsNumberForTotalRow = useMemo(
      () => totals.reduce((prev, cur) => prev + cur, 0),
      [totals],
    );

    const renderedLastRowTotal = useMemo(() => {
      if (!showRowTotal) {
        return null;
      }
      return (
        <Text style={[styles.tableCell, { width: cellWidth }]}>
          {totalsNumberForTotalRow}
        </Text>
      );
    }, [cellWidth, showRowTotal, styles.tableCell, totalsNumberForTotalRow]);

    // The rendered total view
    const renderedTotalView = useMemo(() => {
      if (!showTotal) {
        return null;
      }
      return (
        <View
          wrap={false}
          style={[
            styles.tableRow,
            styles.tableFooter,
            {
              backgroundColor: totalRowBackgroundColor,
            },
          ]}
        >
          {totalRow}
          {renderedLastRowTotal}
        </View>
      );
    }, [
      renderedLastRowTotal,
      showTotal,
      styles.tableFooter,
      styles.tableRow,
      totalRow,
      totalRowBackgroundColor,
    ]);

    return (
      <>
        {renderedTableView}
        {renderedTotalView}
      </>
    );
  },
);

export default ReportDocTable;
