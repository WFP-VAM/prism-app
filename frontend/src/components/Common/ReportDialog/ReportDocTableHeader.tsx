import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { Theme } from '@material-ui/core';
import { Column } from 'utils/analysis-utils';

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    tableName: {
      padding: 6,
      fontWeight: 500,
    },
    tableCell: {
      padding: 8,
      fontSize: theme.pdf?.fontSizes.medium,
    },
    tableRow: {
      display: 'flex',
      flexDirection: 'row',
      lineHeight: 1,
    },
    tableHead: {
      borderBottom: 1,
      borderBottomColor: theme.pdf?.table?.borderColor,
      backgroundColor: theme.pdf?.table?.darkRowColor,
      fontWeight: 500,
    },
  });

interface TableHeaderProps {
  theme: Theme;
  name: string;
  cellWidth: string;
  columns: Column[];
  showTotalsColumn: boolean;
}

const ReportDocTableHeader = memo(
  ({ theme, name, cellWidth, columns, showTotalsColumn }: TableHeaderProps) => {
    const styles = makeStyles(theme);

    // The rendered table header columns
    const renderedTableHeaderColumns = useMemo(() => {
      return columns.map((column: Column) => {
        return (
          <Text
            key={column.id}
            style={[styles.tableCell, { width: cellWidth }]}
          >
            {column.label}
          </Text>
        );
      });
    }, [cellWidth, columns, styles.tableCell]);

    // Whether to show the total columns number
    const renderedTotalColumnsNumber = useMemo(() => {
      if (!showTotalsColumn) {
        return null;
      }
      return (
        <Text style={[styles.tableCell, { width: cellWidth }]}>Total</Text>
      );
    }, [cellWidth, showTotalsColumn, styles.tableCell]);

    return (
      <View style={{ backgroundColor: theme.pdf?.table?.darkRowColor }}>
        <View>
          <Text style={styles.tableName}>{name}</Text>
        </View>
        <View style={[styles.tableHead, styles.tableRow]} wrap={false}>
          {renderedTableHeaderColumns}
          {renderedTotalColumnsNumber}
        </View>
      </View>
    );
  },
);

export default ReportDocTableHeader;
