import { FormControl, MenuItem, Select, Typography } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSafeTranslation } from 'i18n';
import { useCallback } from 'react';

type OptionLabel = string;

export default function SimpleDropdown<OptionValue extends number | string>({
  options,
  value,
  onChange,
  textClass,
  textSx,
  disabled = false,
  ...rest
}: {
  options: [OptionValue, OptionLabel][];
  value: OptionValue;
  onChange: (v: OptionValue) => void;
  textClass?: string;
  textSx?: SxProps<Theme>;
  disabled?: boolean;
}) {
  const { t } = useSafeTranslation();

  const handleChange = useCallback(
    (e: SelectChangeEvent<OptionValue>) => {
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
            <Typography className={textClass} sx={textSx}>
              {t(text)}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
