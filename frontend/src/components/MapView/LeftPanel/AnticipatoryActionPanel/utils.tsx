/* eslint-disable react-refresh/only-export-components */
import { Select, SelectProps } from '@mui/material';

import { aaStyledSelectSx } from './aaPanelStyles';

export { aaCommonSx } from './aaPanelStyles';

export const StyledSelect = ({ sx, ...props }: SelectProps) => (
  <Select
    {...props}
    sx={[aaStyledSelectSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  />
);
