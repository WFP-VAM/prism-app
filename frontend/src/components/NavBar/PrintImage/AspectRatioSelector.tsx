import React, { useState, useEffect } from 'react';
import {
  Box,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  createStyles,
} from '@material-ui/core';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import TuneIcon from '@material-ui/icons/Tune';
import {
  AspectRatio,
  isCustomRatio,
  isAutoRatio,
} from 'components/MapExport/types';
import { useSafeTranslation } from '../../../i18n';
import AspectRatioGlyph from './AspectRatioGlyph';
import { AspectRatioOption } from './printConfig.context';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  options: AspectRatioOption[]; // Includes 'Custom' for UI purposes
  setValue: (value: AspectRatio) => void;
}

const useStyles = makeStyles(() =>
  createStyles({
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    header: {
      fontSize: '14px',
      fontWeight: 400,
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'nowrap',
      width: '100%',
    },
    button: {
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
    },
    buttonContent: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '4px',
      justifyContent: 'center',
    },
    tooltip: {
      fontSize: '0.75em',
    },
    select: {
      backgroundColor: 'white',
      '& .MuiOutlinedInput-input': {
        padding: '8px 12px',
        fontSize: '0.875rem',
      },
    },
    menuItem: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8px',
    },
    customInputs: {
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
    },
    colon: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  }),
);

export function AspectRatioSelector({
  value,
  options: _options,
  setValue,
}: AspectRatioSelectorProps) {
  const classes = useStyles();
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

  const handleDropdownChange = (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => {
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
    <div className={classes.wrapper}>
      <Typography variant="h4" className={classes.header}>
        {t('Aspect Ratio')}
      </Typography>

      {/* Single row of buttons: Auto, A4-P, A4-L, Other */}
      <ToggleButtonGroup
        value={getCurrentValue()}
        exclusive
        onChange={handleChange}
        className={classes.buttonGroup}
      >
        <ToggleButton value="Auto" className={classes.button}>
          <Tooltip
            title={t('Map resizes based on browser window')}
            arrow
            classes={{ tooltip: classes.tooltip }}
          >
            <div className={classes.buttonContent}>
              <AspectRatioGlyph aspectRatio="Auto" size={16} />
              <span>{getLabel('Auto')}</span>
            </div>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="A4-P" className={classes.button}>
          <div className={classes.buttonContent}>
            <AspectRatioGlyph aspectRatio="A4-P" size={16} />
            <span>{getLabel('A4-P')}</span>
          </div>
        </ToggleButton>
        <ToggleButton value="A4-L" className={classes.button}>
          <div className={classes.buttonContent}>
            <AspectRatioGlyph aspectRatio="A4-L" size={16} />
            <span>{getLabel('A4-L')}</span>
          </div>
        </ToggleButton>
        <ToggleButton value="Other" className={classes.button}>
          <div className={classes.buttonContent}>
            <TuneIcon fontSize="small" />
            <span>{getLabel('Other')}</span>
          </div>
        </ToggleButton>
      </ToggleButtonGroup>

      {isOtherActive && (
        <Select
          value={dropdownValue}
          onChange={handleDropdownChange}
          variant="outlined"
          fullWidth
          className={classes.select}
        >
          {presetRatios.map(ratio => (
            <MenuItem key={ratio} value={ratio}>
              <div className={classes.menuItem}>
                <AspectRatioGlyph
                  aspectRatio={ratio as AspectRatio}
                  size={16}
                />
                <span>{ratio}</span>
              </div>
            </MenuItem>
          ))}
          <MenuItem value="Custom">
            <div className={classes.menuItem}>
              <TuneIcon fontSize="small" />
              <span>{getLabel('Custom')}</span>
            </div>
          </MenuItem>
        </Select>
      )}

      {isCustomActive && (
        <Box className={classes.customInputs}>
          <TextField
            type="number"
            label={t('Width')}
            value={value.w}
            onChange={handleCustomChange('w')}
            variant="outlined"
            size="small"
            inputProps={{ min: 0.1, max: 100, step: 0.1 }}
          />
          <span className={classes.colon}>:</span>
          <TextField
            type="number"
            label={t('Height')}
            value={value.h}
            onChange={handleCustomChange('h')}
            variant="outlined"
            size="small"
            inputProps={{ min: 0.1, max: 100, step: 0.1 }}
          />
        </Box>
      )}
    </div>
  );
}

export default AspectRatioSelector;
