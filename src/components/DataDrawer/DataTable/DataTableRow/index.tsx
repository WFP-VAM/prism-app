import React from 'react';
import { TableRow, TableCell } from '@material-ui/core';

export interface TableRowProps {
  className?: string;
  rowData: { key: string; value: string | number }[];
}

const DataTableRow = ({ className, rowData }: TableRowProps) => (
  <TableRow>
    {Object.entries(rowData).map(([cellKey, value]) => (
      <TableCell className={className} key={cellKey}>
        {' '}
        {value}{' '}
      </TableCell>
    ))}
  </TableRow>
);

export default DataTableRow;
