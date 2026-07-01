import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  AspectRatio,
  isAutoRatio,
  isCustomRatio,
} from 'components/MapExport/types';
import React, { useEffect, useState } from 'react';

import { useSafeTranslation } from '../../../i18n';
import AspectRatioGlyph from './AspectRatioGlyph';
import { AspectRatioOption } from './printConfig.context';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  options: AspectRatioOption[]; // Includes 'Custom' for UI purposes
  setValue: (value: AspectRatio) => void;
}

const toggleButtonSx = {
  backgroundColor: 'white',
  height: '32px',
  flex: 1,
  padding: '4px 6px',
  fontSize: '0.7rem',
  border: '1px solid rgba(0, 0, 0, 0.12) !important',
  textTransform: 'none',
  '&.Mui-selected': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
};

export function AspectRatioSelector({
  value,
  options: _options,
  setValue,
}: AspectRatioSelectorProps) {
  const { t } = useSafeTranslation();

  const isAutoActive = isAutoRatio(value);
  const isCustomActive = isCustomRatio(value);
  const presetRatios: string[] = ['3:2', '4:3', '6:5', '1:1', '2:3'];
  const isPresetRatio =
    typeof value === 'string' && !['Auto', 'A4-P', 'A4-L'].includes(value);
  const isOtherActive = isPresetRatio || isCustomActive;
  const [dropdownValue, setDropdownValue] = useState<string>(() => {
    if (isCustomActive) {
      return 'Custom';
    }
    if (isPresetRatio) {
      return value as string;
    }
    return '3:2'; // default
  });

  // Update dropdown value when external value changes
  useEffect(() => {
    if (isCustomActive) {
      setDropdownValue('Custom');
    } else if (isPresetRatio) {
      setDropdownValue(value as string);
    }
  }, [value, isCustomActive, isPresetRatio]);

  const labels: Record<string, string> = {
    Auto: t('Auto'),
    'A4-P': t('A4 Port'),
    'A4-L': t('A4 Land'),
    Other: t('Other'),
    Custom: t('Custom'),
  };

  const getLabel = (ratio: string) => labels[ratio] ?? ratio;

  const getCurrentValue = (): string => {
    if (isAutoActive) {
      return 'Auto';
    }
    if (value === 'A4-P' || value === 'A4-L') {
      return value;
    }
    return 'Other';
  };

  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: string | null,
  ) => {
    if (!newValue) {
      return;
    }
    if (newValue === 'Auto' || newValue === 'A4-P' || newValue === 'A4-L') {
      setValue(newValue as AspectRatio);
    } else if (newValue === 'Other') {
      setValue(
        dropdownValue === 'Custom'
          ? { w: 1, h: 1 }
          : (dropdownValue as AspectRatio),
      );
    }
  };

  const handleDropdownChange = (event: SelectChangeEvent<string>) => {
    const newValue = event.target.value as string;
    setDropdownValue(newValue);
    setValue(
      newValue === 'Custom' ? { w: 1, h: 1 } : (newValue as AspectRatio),
    );
  };

  const handleCustomChange = (dimension: 'w' | 'h') => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isCustomRatio(value)) {
        return;
      }
      const num = parseFloat(event.target.value) || 1;
      setValue({ ...value, [dimension]: num });
    };
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontSize: '14px',
          fontWeight: 400,
        }}
      >
        {t('Aspect Ratio')}
      </Typography>

      {/* Single row of buttons: Auto, A4-P, A4-L, Other */}
      <ToggleButtonGroup
        value={getCurrentValue()}
        exclusive
        onChange={handleChange}
        sx={{
          display: 'flex',
          flexWrap: 'nowrap',
          width: '100%',
        }}
      >
        <ToggleButton value="Auto" sx={toggleButtonSx}>
          <Tooltip
            title={t('Map resizes based on browser window')}
            arrow
            slotProps={{
              tooltip: {
                sx: { fontSize: '0.75em' },
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'center',
              }}
            >
              <AspectRatioGlyph aspectRatio="Auto" size={16} />
              <span>{getLabel('Auto')}</span>
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="A4-P" sx={toggleButtonSx}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center',
            }}
          >
            <AspectRatioGlyph aspectRatio="A4-P" size={16} />
            <span>{getLabel('A4-P')}</span>
          </Box>
        </ToggleButton>
        <ToggleButton value="A4-L" sx={toggleButtonSx}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center',
            }}
          >
            <AspectRatioGlyph aspectRatio="A4-L" size={16} />
            <span>{getLabel('A4-L')}</span>
          </Box>
        </ToggleButton>
        <ToggleButton value="Other" sx={toggleButtonSx}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'center',
            }}
          >
            <TuneIcon fontSize="small" />
            <span>{getLabel('Other')}</span>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {isOtherActive && (
        <Select
          value={dropdownValue}
          onChange={handleDropdownChange}
          variant="outlined"
          fullWidth
          sx={{
            backgroundColor: 'white',
            '& .MuiOutlinedInput-input': {
              padding: '8px 12px',
              fontSize: '0.875rem',
            },
          }}
        >
          {presetRatios.map(ratio => (
            <MenuItem key={ratio} value={ratio}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AspectRatioGlyph
                  aspectRatio={ratio as AspectRatio}
                  size={16}
                />
                <span>{ratio}</span>
              </Box>
            </MenuItem>
          ))}
          <MenuItem value="Custom">
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <TuneIcon fontSize="small" />
              <span>{getLabel('Custom')}</span>
            </Box>
          </MenuItem>
        </Select>
      )}

      {isCustomActive && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            backgroundColor: '#F1F1F1',
            borderRadius: '4px',
            '& .MuiTextField-root': {
              width: '60px',
            },
            '& input': {
              fontSize: '0.875rem',
              padding: '6px 8px',
            },
          }}
        >
          <TextField
            type="number"
            label={t('Width')}
            value={value.w}
            onChange={handleCustomChange('w')}
            variant="outlined"
            size="small"
            slotProps={{ htmlInput: { min: 0.1, max: 100, step: 0.1 } }}
          />
          <Box
            component="span"
            sx={{
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            :
          </Box>
          <TextField
            type="number"
            label={t('Height')}
            value={value.h}
            onChange={handleCustomChange('h')}
            variant="outlined"
            size="small"
            slotProps={{ htmlInput: { min: 0.1, max: 100, step: 0.1 } }}
          />
        </Box>
      )}
    </Box>
  );
}

export default AspectRatioSelector;
