import React from 'react';
import { isNumber } from 'lodash';
import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@material-ui/core';
import { TableRowType } from '../../../../context/tableStateSlice';
import { getRoundedData } from '../../../../utils/data-utils';

export interface TableRowProps {
  className?: string;
  columns: string[];
  rowData?: TableRowType;
}

const DataTableRow = ({ className, columns, rowData }: TableRowProps) => {
  const { t } = useTranslation();
  return (
    <TableRow>
      {columns.map(column => {
        const colValue = rowData ? rowData[column] : column;
        const formattedColValue = isNumber(colValue)
          ? getRoundedData(colValue, t)
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
};

export default DataTableRow;
