import React from 'react';
import { isNumber } from 'lodash';
import { TableRow, TableCell } from '@material-ui/core';
import { TableRowType } from '../../../../context/tableStateSlice';
import { getRoundedData } from '../../../MapView/utils';

export interface TableRowProps {
  className?: string;
  columns: string[];
  rowData?: TableRowType;
}

const DataTableRow = ({ className, columns, rowData }: TableRowProps) => (
  <TableRow>
    {columns.map(column => {
      const colValue = rowData ? rowData[column] : column;
      const formattedColValue = isNumber(colValue)
        ? getRoundedData(colValue)
        : colValue.toLocaleString();
      return (
        <TableCell className={className} key={column}>
          {' '}
          {formattedColValue}{' '}
        </TableCell>
      );
    })}
  </TableRow>
);

export default DataTableRow;
