import React from 'react';
import Papa from 'papaparse';
import csv from 'csvtojson';
import { useSelector } from 'react-redux';
import { getCurrTable } from '../../../context/tableStateSlice';

const DataTable = () => {
  // get and destructure the currently open table
  const { title, table, legendText } = useSelector(getCurrTable);

  const tableUrl = process.env.PUBLIC_URL + table;

  console.log(`parsing ${tableUrl}`);

  // try{
  //   csv().fromFile(tableUrl).then(json => console.log(json))
  // }
  // catch(error){
  //   console.log(error.message);
  // }

  Papa.parse(tableUrl, {
    header: true,
    download: true,
    step: row => console.log('Row: ', row.data),
    complete: (results, file) => console.log({ results }),
  });

  // try
  // {
  //   csv().fromFile(table)
  //     .then( jsonObj => console.log( jsonObj ))
  // }
  // catch( error ) {
  //   console.log( `error loading ${table} csv`)
  // }

  return (
    <div>
      <h2>{title}</h2>
      <p>{table}</p>
      <p>{legendText}</p>

      {/* Table goes here! */}
    </div>
  );
};

export default DataTable;
