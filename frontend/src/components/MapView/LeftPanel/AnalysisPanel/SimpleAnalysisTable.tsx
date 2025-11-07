import { memo, useMemo, useState } from 'react';
import {
  makeStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { ArrowUpward, ArrowDownward } from '@material-ui/icons';
import { TableRow as AnalysisTableRow } from 'context/analysisResultStateSlice';
import { Column } from 'utils/analysis-utils';

interface SimpleAnalysisTableProps {
  tableData: AnalysisTableRow[];
  columns: Column[];
  sortColumn?: string | number;
  isAscending?: boolean;
  onSort?: (columnId: string | number) => void;
  maxRows?: number;
}

const SimpleAnalysisTable = memo(
  ({
    tableData,
    columns,
    sortColumn,
    isAscending = true,
    onSort,
    maxRows = 10,
  }: SimpleAnalysisTableProps) => {
    const classes = useStyles();
    const [internalSortColumn, setInternalSortColumn] = useState<
      string | number
    >('name');
    const [internalIsAscending, setInternalIsAscending] = useState(true);

    // Use internal sorting if no external sorting is provided
    const activeSortColumn = sortColumn ?? internalSortColumn;
    const activeIsAscending =
      sortColumn !== undefined ? isAscending : internalIsAscending;

    // Handle sorting
    const handleSort = (columnId: string | number) => {
      if (onSort) {
        onSort(columnId);
      } else if (activeSortColumn === columnId) {
        setInternalIsAscending(!activeIsAscending);
      } else {
        setInternalSortColumn(columnId);
        setInternalIsAscending(true);
      }
    };

    const sortedData = useMemo(() => {
      if (!activeSortColumn) {
        return tableData;
      }

      const tableCopy = [...tableData];
      // Sorting a copy of the array, not mutating original
      // eslint-disable-next-line fp/no-mutating-methods
      return tableCopy.sort((a, b) => {
        const aValue = a[activeSortColumn];
        const bValue = b[activeSortColumn];

        if (aValue < bValue) {
          return activeIsAscending ? -1 : 1;
        }
        if (aValue > bValue) {
          return activeIsAscending ? 1 : -1;
        }
        return 0;
      });
    }, [tableData, activeSortColumn, activeIsAscending]);

    // Get the primary columns (name + first numeric column)
    const displayColumns = useMemo(() => {
      const nameColumn = columns.find(col => col.id === 'name') || columns[0];
      const numericColumn =
        columns.find(
          col =>
            col.id !== 'name' && typeof tableData[0]?.[col.id] === 'number',
        ) || columns[1];

      return [nameColumn, numericColumn].filter(Boolean);
    }, [columns, tableData]);

    // Limit rows and determine if we need an ellipsis
    const displayData = useMemo(() => {
      const hasMoreRows = sortedData.length > maxRows;
      const limitedData = sortedData.slice(0, maxRows);
      return { data: limitedData, hasMoreRows };
    }, [sortedData, maxRows]);

    const renderSortIcon = (columnId: string | number, isNumeric = false) => {
      const iconClass = isNumeric ? classes.numericSortIcon : classes.sortIcon;

      if (activeSortColumn !== columnId) {
        return <ArrowUpward className={iconClass} style={{ opacity: 0.3 }} />;
      }
      return activeIsAscending ? (
        <ArrowUpward className={iconClass} />
      ) : (
        <ArrowDownward className={iconClass} />
      );
    };

    return (
      <TableContainer className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              {displayColumns.map((column, index) => (
                <TableCell
                  key={column.id}
                  className={`${classes.headerCell} ${index === 1 ? classes.numericCell : ''}`}
                >
                  <div
                    className={`${classes.headerContent} ${index === 1 ? classes.numericHeaderContent : ''}`}
                    onClick={() => handleSort(column.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSort(column.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <Typography
                      className={`${classes.headerText} ${index === 1 ? classes.numericHeaderText : ''}`}
                    >
                      {column.label}
                    </Typography>
                    {renderSortIcon(column.id, index === 1)}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.data.map((row, index) => (
              <TableRow
                key={row.key || index}
                className={index % 2 === 0 ? classes.evenRow : classes.oddRow}
              >
                {displayColumns.map((column, colIndex) => (
                  <TableCell
                    key={column.id}
                    className={`${classes.bodyCell} ${colIndex === 1 ? classes.numericCell : ''}`}
                  >
                    <Typography className={classes.bodyText}>
                      {column.format && typeof row[column.id] === 'number'
                        ? column.format(row[column.id])
                        : row[column.id]}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {displayData.hasMoreRows && (
              <TableRow className={classes.ellipsisRow}>
                <TableCell className={classes.bodyCell}>
                  <Typography className={classes.ellipsisText}>...</Typography>
                </TableCell>
                <TableCell
                  className={`${classes.bodyCell} ${classes.numericCell}`}
                >
                  <Typography className={classes.ellipsisText}>...</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  },
);

const useStyles = makeStyles(theme => ({
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: 'none',
    border: `1px solid ${theme.palette.divider}`,
  },
  headerCell: {
    backgroundColor: theme.palette.divider,
    border: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '4px 8px',
    '&:first-child': {
      paddingLeft: 16,
    },
    '&:last-child': {
      paddingRight: 16,
    },
  },
  numericCell: {
    textAlign: 'right !important' as any,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.7,
    },
  },
  numericHeaderContent: {
    justifyContent: 'flex-end',
  },
  headerText: {
    fontWeight: 600,
    fontSize: '14px',
  },
  numericHeaderText: {
    textAlign: 'right',
  },
  sortIcon: {
    fontSize: '16px',
    color: 'black',
    marginLeft: 4,
  },
  numericSortIcon: {
    fontSize: '16px',
    color: 'black',
    marginLeft: 4,
  },
  bodyCell: {
    border: 'none',
    padding: '4px',
    '&:first-child': {
      paddingLeft: 16,
    },
    '&:last-child': {
      paddingRight: 16,
    },
  },
  bodyText: {
    fontSize: '14px',
    color: '#333333',
  },
  evenRow: {
    backgroundColor: 'white !important' as any,
    '& .MuiTableCell-root': {
      backgroundColor: 'transparent',
    },
  },
  oddRow: {
    backgroundColor: '#F8F8F8 !important' as any,
    '& .MuiTableCell-root': {
      backgroundColor: 'transparent',
    },
  },
  ellipsisRow: {
    backgroundColor: 'white !important' as any,
    '& .MuiTableCell-root': {
      backgroundColor: 'transparent',
    },
  },
  ellipsisText: {
    fontSize: '14px',
    color: '#999999',
    textAlign: 'center' as any,
    fontWeight: 'bold',
    letterSpacing: '2px',
  },
}));

export default SimpleAnalysisTable;
