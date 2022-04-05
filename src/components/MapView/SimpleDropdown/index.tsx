import { FormControl, MenuItem, Select } from '@material-ui/core';
import React from 'react';
import { useSafeTranslation } from '../../../i18n';

type OptionLabel = string;

export default function SimpleDropdown<OptionValue extends number | string>({
  options,
  value,
  onChange,
  ...rest
}: {
  options: [OptionValue, OptionLabel][];
  value: OptionValue;
  onChange: (value: OptionValue) => void;
}) {
  const { t } = useSafeTranslation();
  return (
    <FormControl {...rest}>
      <Select
        value={value === undefined ? '' : value}
        onChange={e => {
          onChange(e.target.value as OptionValue);
        }}
      >
        {options.map(([val, text]) => (
          <MenuItem key={val} value={val}>
            {t(text)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
