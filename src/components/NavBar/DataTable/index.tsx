import React from 'react';
import { useSelector } from 'react-redux';
import { getCurrTable } from '../../../context/tableStateSlice';

const DataTable = () => {
  // get and destructure the currently open table
  const { title, table, legendText } = useSelector(getCurrTable);

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
