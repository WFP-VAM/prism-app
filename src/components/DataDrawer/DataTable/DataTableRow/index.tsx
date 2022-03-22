import React from 'react';
import { isNumber } from 'lodash';
import { TableRow, TableCell } from '@material-ui/core';
import { TableRowType } from '../../../../context/tableStateSlice';
import { getRoundedData } from '../../../../utils/data-utils';
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
        const colValue = rowData ? rowData[column] : column;
        const formattedColValue = isNumber(colValue)
          ? getRoundedData(colValue, t)
          : t(colValue).toLocaleString();
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
