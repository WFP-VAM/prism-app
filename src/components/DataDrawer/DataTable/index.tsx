import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  makeStyles,
  Paper,
} from '@material-ui/core';
import { getCurrTable } from '../../../context/tableStateSlice';
import DataTableRow from './DataTableRow';

const useStyles = makeStyles({
  root: {
    width: '100%',
    height: '70vh',
    color: 'black',
  },
  container: {
    maxHeight: '100%',
  },
  headCells: {
    color: 'black',
  },
  tableCells: {
    color: 'darkGrey',
  },
});

export interface DataTableConfig {
  maxResults: number;
}

const DataTable = ({ maxResults }: DataTableConfig) => {
  const classes = useStyles();

  // get and destructure the currently open table
  const { title, table, legendText } = useSelector(getCurrTable);
  // set up state to store results from parsing the CSV
  const [tableJson, setTableJson] = useState<any[]>([]);

  const tableUrl = process.env.PUBLIC_URL + table;

  // parse the csv, but only when we get a new table to parse
  useEffect(() => {
    Papa.parse(tableUrl, {
      header: true,
      download: true,
      complete: results => {
        setTableJson(results.data);
      },
    });
  }, [table, tableUrl]);

  return (
    <div>
      <h2>{title}</h2>
      <p>{legendText}</p>
      <p>
        <a href={process.env.PUBLIC_URL + table}>Download as CSV</a>
      </p>

      {tableJson.length > 0 && (
        <Paper className={classes.root}>
          <TableContainer className={classes.container}>
            <Table stickyHeader aria-label={`table showing ${title}`}>
              <TableHead>
                <DataTableRow
                  key="head"
                  className={classes.headCells}
                  rowData={tableJson[0]}
                />
              </TableHead>
              <TableBody>
                {tableJson.slice(1, maxResults).map((rowJson, index) => (
                  <DataTableRow
                    key={`row_${String(index)}`}
                    className={classes.tableCells}
                    rowData={rowJson}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </div>
  );
};

export default DataTable;
