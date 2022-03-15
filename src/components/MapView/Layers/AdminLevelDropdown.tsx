import {
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { menuList } from '../../NavBar/utils';
import { LayerKey, LayerType } from '../../../config/types';

const DEFAULT_ADMIN_LEVEL = 3;

interface AdminLevelDropdownProps {
  value: String;
  onChange: (val: any) => void;
}

export default function AdminLevelDropdown({
  value,
  onChange,
  ...rest
}: AdminLevelDropdownProps) {
  const options = [
    ['1', '1 - Province'],
    ['2', '2 - County'],
    ['3', '3 - Township'],
  ];

  return (
    <FormControl {...rest}>
      <Select
        defaultValue={DEFAULT_ADMIN_LEVEL}
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value as Number);
        }}
      >
        {options.map(([val, text]) => (
          <MenuItem key={val} value={val}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
