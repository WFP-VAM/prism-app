import { FormControl, MenuItem, Select, Typography } from '@material-ui/core';
import React from 'react';
import { useSafeTranslation } from 'i18n';

type OptionLabel = string;

export default function SimpleDropdown<OptionValue extends number | string>({
  options,
  value,
  onChange,
  textClass,
  ...rest
}: {
  options: [OptionValue, OptionLabel][];
  value: OptionValue;
  onChange: (value: OptionValue) => void;
  textClass: string;
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
            <Typography className={textClass}>{t(text)}</Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
