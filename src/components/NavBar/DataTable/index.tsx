import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Theme,
  createStyles,
  makeStyles,
  Paper,
} from '@material-ui/core';
import { getCurrTable } from '../../../context/tableStateSlice';

const useStyles = makeStyles({
  root: {
    width: '100%',
    color: 'black',
  },
  container: {
    maxHeight: 440,
  },
  headCells: {
    color: 'black',
  },
  tableCells: {
    color: 'darkGrey',
  },
});

const DataTable = () => {
  const classes = useStyles();

  // get and destructure the currently open table
  const { title, table, legendText } = useSelector(getCurrTable);
  // set up state to store results from parsing the CSV
  const [tableJson, setTableJson] = useState<any[]>([]);

  const tableUrl = process.env.PUBLIC_URL + table;

  // parse the csv, but only when we get a new table to parse
  useEffect(() => {
    console.log(`parsing ${table} csv`);
    Papa.parse(tableUrl, {
      header: true,
      download: true,
      // step: row => console.log("Row: " , row.data),
      complete: (results, file) => {
        console.log(results.data);
        setTableJson(results.data);
      },
    });
  }, [table, tableUrl]);

  return (
    <div>
      <h2>{title}</h2>
      <p>{table}</p>
      <p>{legendText}</p>

      {tableJson.length > 0 && (
        <Paper className={classes.root}>
          <TableContainer className={classes.container}>
            <Table stickyHeader aria-label={`table showing ${title}`}>
              <TableHead>
                <TableRow>
                  {Object.entries(tableJson[0]).map(([key, value]) => (
                    <TableCell className={classes.headCells} key={key}>
                      {' '}
                      {value}{' '}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableJson.slice(1).map(rowJson => (
                  <TableRow
                    key={`${Object.values(rowJson)[0]} ${
                      Object.values(rowJson)[1]
                    }`}
                  >
                    {Object.entries(rowJson).map(([key, value]) => (
                      <TableCell className={classes.tableCells} key={key}>
                        {' '}
                        {value}{' '}
                      </TableCell>
                    ))}
                  </TableRow>
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
