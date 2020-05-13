import React from 'react';
import { TableType } from '../../../config/types';

const DataTable = ({ title, table, legendText }: TableType) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>{table}</p>
      <p>{legendText}</p>
    </div>
  );
};

export default DataTable;
