import React from 'react';
import { TableRow, TableCell } from '@material-ui/core';

export interface TableRowProps {
  key: string;
  className?: string;
  rowData: any;
}

const DataTableRow = ({ className, rowData, key }: TableRowProps) => (
  <TableRow key={key}>
    {Object.entries(rowData).map(([cellKey, value]) => (
      <TableCell className={className} key={cellKey}>
        {' '}
        {value}{' '}
      </TableCell>
    ))}
  </TableRow>
);

export default DataTableRow;
