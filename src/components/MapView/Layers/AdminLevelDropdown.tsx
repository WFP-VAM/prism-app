import {
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { menuList } from '../../NavBar/utils';
<<<<<<< HEAD
import { AdminLevelType, LayerKey, LayerType } from '../../../config/types';

interface AdminLevelDropdownProps {
  value: AdminLevelType;
=======
import { LayerKey, LayerType } from '../../../config/types';

const DEFAULT_ADMIN_LEVEL = 3;

interface AdminLevelDropdownProps {
  value: String;
>>>>>>> 0bc3acd0eaa84391c72539064cb2a1f55dc25813
  onChange: (val: any) => void;
}

export default function AdminLevelDropdown({
  value,
  onChange,
  ...rest
}: AdminLevelDropdownProps) {
  const options = [
<<<<<<< HEAD
    [1, '1 - Province'],
    [2, '2 - County'],
    [3, '3 - Township'],
=======
    ['1', '1 - Province'],
    ['2', '2 - County'],
    ['3', '3 - Township'],
>>>>>>> 0bc3acd0eaa84391c72539064cb2a1f55dc25813
  ];

  return (
    <FormControl {...rest}>
      <Select
<<<<<<< HEAD
        defaultValue={1}
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value as AdminLevelType);
=======
        defaultValue={DEFAULT_ADMIN_LEVEL}
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value as Number);
>>>>>>> 0bc3acd0eaa84391c72539064cb2a1f55dc25813
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
