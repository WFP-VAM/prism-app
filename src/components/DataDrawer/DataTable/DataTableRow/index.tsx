import React from 'react';
import { TableRow, TableCell } from '@material-ui/core';

export interface TableRowProps {
  className: any;
  rowData: any;
}

// not worth trying to put keys to this data unfortunately for now
const DataTableRow = ({ className, rowData }: TableRowProps) => (
  <TableRow
  // key={`${Object.values(rowData)[0]} ${Object.values(rowData)[1]}`}
  >
    {Object.entries(rowData).map(([key, value]) => (
      <TableCell className={className} key={key}>
        {' '}
        {value}{' '}
      </TableCell>
    ))}
  </TableRow>
);

export default DataTableRow;
