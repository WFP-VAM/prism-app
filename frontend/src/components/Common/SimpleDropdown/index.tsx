import React, { useCallback } from 'react';
import { FormControl, MenuItem, Select, Typography } from '@material-ui/core';
import { useSafeTranslation } from 'i18n';

type OptionLabel = string;

export default function SimpleDropdown<OptionValue extends number | string>({
  options,
  value,
  onChange,
  textClass,
  disabled = false,
  ...rest
}: {
  options: [OptionValue, OptionLabel][];
  value: OptionValue;
  onChange: (v: OptionValue) => void;
  textClass: string;
  disabled?: boolean;
}) {
  const { t } = useSafeTranslation();

  const handleChange = useCallback(
    (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
      onChange(e.target.value as OptionValue);
    },
    [onChange],
  );

  return (
    <FormControl {...rest}>
      <Select
        value={value === undefined ? '' : value}
        onChange={handleChange}
        disabled={disabled}
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
