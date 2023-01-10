import React, { useState } from 'react';
import {
  createStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';

import { useSelector } from 'react-redux';
import { getCurrentData } from '../../../../../../context/analysisResultStateSlice';

import { useSafeTranslation } from '../../../../../../i18n';

import { getTableCellVal } from '../../../../../../utils/data-utils';

function ExposureAnalysisTable({ classes }: ExposureAnalysisTableProps) {
  // only display local names if local language is selected, otherwise display english name
  const { t } = useSafeTranslation();

  const analysisData = useSelector(getCurrentData);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <div className={classes.exposureAnalysisTable}>
      <TableContainer className={classes.tableContainer}>
        <Table stickyHeader aria-label="exposure analysis table">
          <TableHead>
            <TableRow>
              {analysisData.columns.map(column => {
                const formattedColValue = getTableCellVal(
                  analysisData.rows[0],
                  column,
                  t,
                );
                return (
                  <TableCell key={column} className={classes.tableHead}>
                    <Typography className={classes.tableHeaderText}>
                      {' '}
                      {formattedColValue}{' '}
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody className={classes.tableBody}>
            {analysisData.rows
              .slice(
                page * rowsPerPage + 1,
                page * rowsPerPage + rowsPerPage + 1,
              )
              .map(rowData => (
                <TableRow>
                  {analysisData.columns.map(column => {
                    const formattedColValue = getTableCellVal(
                      rowData,
                      column,
                      t,
                    );
                    return (
                      <TableCell key={column} className={classes.tableBody}>
                        <Typography className={classes.tableBodyText}>
                          {' '}
                          {formattedColValue}{' '}
                        </Typography>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
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
      maxHeight: '85%',
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
    },
    select: {
      flex: '1 1 10%',
      maxWidth: '10%',
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
