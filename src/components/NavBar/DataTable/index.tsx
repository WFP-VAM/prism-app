import React from 'react';
import { useSelector } from 'react-redux';

import { getCurrTable } from '../../../context/tableStateSlice';

const DataTable = () => {
  const { title, table, legendText } = useSelector(getCurrTable);

  console.log(title);
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
