import { memo, useCallback, useMemo } from 'react';
import { Theme } from '@material-ui/core';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { chunk } from 'lodash';
import { TFunction, getRoundedData } from 'utils/data-utils';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { Column } from 'utils/analysis-utils';
import { FIRST_PAGE_TABLE_ROWS, MAX_TABLE_ROWS_PER_PAGE } from './types';
import ReportDocTableHeader from './ReportDocTableHeader';

const makeStyles = (theme: Theme) =>
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
  t: TFunction;
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
    const styles = makeStyles(theme);

    const totals = useMemo(() => {
      return showTotal
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
        : [];
    }, [columns, rows, showTotal]);

    const firstPageChunk = useMemo(() => {
      return rows.slice(0, FIRST_PAGE_TABLE_ROWS);
    }, [rows]);

    const restPagesChunks = useMemo(() => {
      return chunk(rows.slice(FIRST_PAGE_TABLE_ROWS), MAX_TABLE_ROWS_PER_PAGE);
    }, [rows]);

    const chunks = useMemo(() => {
      return [firstPageChunk, ...restPagesChunks];
    }, [firstPageChunk, restPagesChunks]);

    // the table row color
    const getTableRowColor = useCallback(
      (rowIndex: number) => {
        return rowIndex % 2
          ? theme.pdf?.table?.darkRowColor
          : theme.pdf?.table?.lightRowColor;
      },
      [theme.pdf],
    );

    // Gets the total sum of row
    const getRowTotal = useCallback(
      (rowData: AnalysisTableRow) => {
        return columns.reduce((prev, curr) => {
          const val = rowData[curr.id];
          if (!Number.isNaN(Number(val))) {
            return prev + Number(val);
          }
          return prev;
        }, 0);
      },
      [columns],
    );

    // The rendered tableCell values
    const renderedTableCellValues = useCallback(
      (rowData: AnalysisTableRow) => {
        return columns.map((column: Column) => {
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
        });
      },
      [cellWidth, columns, styles.tableCell],
    );

    // The rendered total row
    const renderedTotalRow = useCallback(
      rowData => {
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
      (tableRow: AnalysisTableRow[]) => {
        return tableRow.map((rowData, index) => {
          return (
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
          );
        });
      },
      [
        getTableRowColor,
        renderedTableCellValues,
        renderedTotalRow,
        styles.tableRow,
      ],
    );

    // The rendered table view
    const renderedTableView = useMemo(() => {
      return chunks.map(chunkRow => {
        return (
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
        );
      });
    }, [
      cellWidth,
      chunks,
      columns,
      name,
      renderedTableRow,
      showRowTotal,
      theme,
    ]);

    // gets the total row color
    const totalRowBackgroundColor = useMemo(() => {
      return rows.length % 2
        ? theme.pdf?.table?.darkRowColor
        : theme.pdf?.table?.lightRowColor;
    }, [rows.length, theme.pdf]);

    // The total row
    const totalRow = useMemo(() => {
      return totals.map((val, index) => {
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
      });
    }, [cellWidth, styles.tableCell, totals]);

    const totalsNumberForTotalRow = useMemo(() => {
      return totals.reduce((prev, cur) => {
        return prev + cur;
      }, 0);
    }, [totals]);

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
