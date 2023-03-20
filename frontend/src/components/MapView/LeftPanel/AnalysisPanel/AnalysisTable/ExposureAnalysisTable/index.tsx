import React, { useCallback, useMemo, useState, MouseEvent } from 'react';
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

import { useSelector } from 'react-redux';
import { orderBy } from 'lodash';
import {
  analysisResultSelector,
  getCurrentData,
  TableRowType,
} from '../../../../../../context/analysisResultStateSlice';

import { useSafeTranslation } from '../../../../../../i18n';

import { getTableCellVal } from '../../../../../../utils/data-utils';

function ExposureAnalysisTable({ classes }: ExposureAnalysisTableProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();

  const analysisData = useSelector(getCurrentData);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [isAscending, setIsAscending] = useState(true);

  // The table columns
  const tableColumns = useMemo(() => {
    return analysisData.columns;
  }, [analysisData.columns]);

  // The table rows
  const tableRows = useMemo(() => {
    return analysisData.rows;
  }, [analysisData.rows]);

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

  const handleChangeOrderBy = useCallback(
    (newSortColumn: string) => {
      const newIsAsc = !(sortColumn === newSortColumn && isAscending);
      setPage(0);
      setSortColumn(newSortColumn);
      setIsAscending(newIsAsc);
    },
    [isAscending, sortColumn],
  );

  // Whether the table sort label is active
  const tableSortLabelIsActive = useCallback(
    (tableColumn: string) => {
      return sortColumn === tableColumn;
    },
    [sortColumn],
  );

  // table sort label direction
  const tableSortLabelDirection = useCallback(
    (tableColumn: string) => {
      return sortColumn === tableColumn && !isAscending ? 'desc' : 'asc';
    },
    [isAscending, sortColumn],
  );

  // on table sort label click
  const onTableSortLabelClick = useCallback(
    (tableColumn: string) => {
      return () => {
        handleChangeOrderBy(tableColumn);
      };
    },
    [handleChangeOrderBy],
  );

  // The rendered table header cells
  const renderedTableHeaderCells = useMemo(() => {
    return tableColumns.map(tableColumn => {
      const formattedColValue = getTableCellVal(tableRows[0], tableColumn, t);
      return (
        <TableCell key={tableColumn} className={classes.tableHead}>
          <TableSortLabel
            active={tableSortLabelIsActive(tableColumn)}
            direction={tableSortLabelDirection(tableColumn)}
            onClick={onTableSortLabelClick(tableColumn)}
          >
            <Typography className={classes.tableHeaderText}>
              {' '}
              {formattedColValue}{' '}
            </Typography>
          </TableSortLabel>
        </TableCell>
      );
    });
  }, [
    classes.tableHead,
    classes.tableHeaderText,
    onTableSortLabelClick,
    t,
    tableColumns,
    tableRows,
    tableSortLabelDirection,
    tableSortLabelIsActive,
  ]);

  // The rendered table body cells
  const renderedTableBodyCells = useCallback(
    (rowData: TableRowType) => {
      return tableColumns.map(tableColumn => {
        const formattedColValue = getTableCellVal(rowData, tableColumn, t);
        return (
          <TableCell key={tableColumn} className={classes.tableBody}>
            <Typography className={classes.tableBodyText}>
              {' '}
              {formattedColValue}{' '}
            </Typography>
          </TableCell>
        );
      });
    },
    [classes.tableBody, classes.tableBodyText, t, tableColumns],
  );

  // The rendered table body rows
  const renderedTableBodyRows = useMemo(() => {
    return orderBy(tableRows, sortColumn, isAscending ? 'asc' : 'desc')
      .slice(page * rowsPerPage + 1, page * rowsPerPage + rowsPerPage + 1)
      .map(rowData => {
        return (
          <TableRow key={JSON.stringify(rowData)}>
            {renderedTableBodyCells(rowData)}
          </TableRow>
        );
      });
  }, [
    isAscending,
    page,
    renderedTableBodyCells,
    rowsPerPage,
    sortColumn,
    tableRows,
  ]);

  return (
    <div className={classes.exposureAnalysisTable}>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="exposure analysis table">
          <TableHead>
            <TableRow>{renderedTableHeaderCells}</TableRow>
          </TableHead>
          <TableBody className={classes.tableBody}>
            {renderedTableBodyRows}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={analysisData.rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
        labelRowsPerPage={t('Rows Per Page')}
        // Temporary manual translation before we upgrade to MUI 5.
        labelDisplayedRows={({ from, to, count }) => {
          return `${from}–${to} ${t('of')} ${
            count !== -1 ? count : `${t('more than')} ${to}`
          }`;
        }}
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
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    exposureAnalysisTable: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      maxHeight: 'inherit',
    },
    tableContainer: {
      maxWidth: '90%',
    },
    tableHead: {
      backgroundColor: '#EBEBEB',
      boxShadow: 'inset 0px -1px 0px rgba(0, 0, 0, 0.25)',
    },
    tableHeaderText: {
      color: 'black',
      fontWeight: 500,
    },
    tableBody: {
      padding: '8px',
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
      overflow: 'unset',
    },
    select: {
      flex: '1 1 10%',
      marginRight: 0,
    },
    caption: {
      flex: '1 2 40%',
      fontSize: '0.5rem',
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

interface ExposureAnalysisTableProps extends WithStyles<typeof styles> {
  maxResults: number;
}

export default withStyles(styles)(ExposureAnalysisTable);
