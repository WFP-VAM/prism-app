import { FormControl, MenuItem, Select } from '@material-ui/core';
import React from 'react';

type OptionValue = number | string;
type OptionLabel = string;
type DropdownOption = [OptionValue, OptionLabel];

interface SimpleDropdownProps {
  options: DropdownOption[];
  value: OptionValue;
  // want to do (val: OptionValue)
  // but this causes type conflicts when a user knows that val will be an enum
  onChange: (val: any) => void;
}

export default function SimpleDropdown({
  options,
  value = '',
  onChange,
  ...rest
}: SimpleDropdownProps) {
  return (
    <FormControl {...rest}>
      <Select
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value as OptionValue);
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
