import React from 'react';
import { TableRow, TableCell } from '@material-ui/core';
import { TableRowType } from '../../../../context/tableStateSlice';
import { getTableCellVal } from '../../../../utils/data-utils';
import { useSafeTranslation } from '../../../../i18n';

export interface TableRowProps {
  className?: string;
  columns: string[];
  rowData?: TableRowType;
}

const DataTableRow = ({ className, columns, rowData }: TableRowProps) => {
  const { t } = useSafeTranslation();
  return (
    <TableRow>
      {columns.map(column => {
        const formattedColValue = getTableCellVal(rowData, column, t);
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
