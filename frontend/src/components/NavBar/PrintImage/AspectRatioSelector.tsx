import React from 'react';
import {
  Box,
  TextField,
  Typography,
  makeStyles,
  createStyles,
} from '@material-ui/core';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
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
      gap: '0.75rem',
    },
    header: {
      fontSize: '14px',
      fontWeight: 400,
    },
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    sectionLabel: {
      fontSize: '12px',
      color: 'rgba(0, 0, 0, 0.6)',
      marginBottom: '0.25rem',
    },
    autoButton: {
      backgroundColor: 'white',
      height: 'auto',
      padding: '4px 12px',
      fontSize: '0.875rem',
      border: '1px solid rgba(0, 0, 0, 0.12) !important',
      textTransform: 'none',
      justifyContent: 'flex-start',
      '&.Mui-selected': {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
      },
    },
    autoButtonLabel: {
      fontWeight: 500,
    },
    autoButtonDescription: {
      fontSize: '0.75rem',
      color: 'rgba(0, 0, 0, 0.6)',
      textAlign: 'left',
    },
    buttonGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
    },
    button: {
      backgroundColor: 'white',
      height: '32px',
      minWidth: '60px',
      padding: '4px 8px',
      fontSize: '0.7rem',
      border: '1px solid rgba(0, 0, 0, 0.12) !important',
      '&.Mui-selected': {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
      },
    },
    buttonContent: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '4px',
    },
    customButton: {
      backgroundColor: 'white',
      height: 'auto',
      minHeight: '48px',
      padding: '8px 12px',
      fontSize: '0.875rem',
      border: '1px solid rgba(0, 0, 0, 0.12) !important',
      textTransform: 'none',
      justifyContent: 'flex-start',
      '&.Mui-selected': {
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
      },
    },
    customButtonContent: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
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

/**
 * Get display label for each aspect ratio option
 */
function getAspectRatioLabel(ratio: AspectRatioOption): string {
  if (ratio === 'Auto') {
    return 'Auto';
  }
  if (ratio === 'A4-P') {
    return 'A4-P';
  }
  if (ratio === 'A4-L') {
    return 'A4-L';
  }
  if (ratio === 'Custom') {
    return 'Custom';
  }
  if (typeof ratio === 'object') {
    return 'Custom';
  }
  return ratio;
}

/**
 * Check if an option is a string preset (not Auto, Custom, or object)
 */
function isStringPreset(option: AspectRatioOption): boolean {
  return typeof option === 'string' && option !== 'Auto' && option !== 'Custom';
}

export function AspectRatioSelector({
  value,
  options,
  setValue,
}: AspectRatioSelectorProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const isAutoActive = isAutoRatio(value);
  const isCustomActive = isCustomRatio(value);

  const stringPresets = options.filter(isStringPreset) as string[];

  const selectedPreset =
    isAutoActive || isCustomActive
      ? null
      : typeof value === 'string'
        ? value
        : null;

  const handleAutoToggle = () => {
    if (isAutoActive) {
      return;
    }
    setValue('Auto');
  };

  const handlePresetChange = (
    _event: React.MouseEvent<HTMLElement>,
    newValue: string | null,
  ) => {
    if (newValue === null) {
      return; // Don't allow deselection
    }
    setValue(newValue as AspectRatio);
  };

  const handleCustomToggle = () => {
    if (isCustomActive) {
      return;
    }
    setValue({ w: 1, h: 1 });
  };

  const handleCustomWidthChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isCustomRatio(value)) {
      return;
    }
    const w = parseFloat(event.target.value) || 1;
    setValue({ w, h: value.h });
  };

  const handleCustomHeightChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!isCustomRatio(value)) {
      return;
    }
    const h = parseFloat(event.target.value) || 1;
    setValue({ w: value.w, h });
  };

  return (
    <div className={classes.wrapper}>
      <Typography variant="h4" className={classes.header}>
        {t('Aspect Ratio')}
      </Typography>

      <div className={classes.section} style={{ flexDirection: 'row' }}>
        <ToggleButton
          value="auto"
          selected={isAutoActive}
          onClick={handleAutoToggle}
          className={classes.autoButton}
        >
          {t('Auto')}
        </ToggleButton>
        <div className={classes.autoButtonDescription}>
          Map resizes based on your browser window
        </div>
      </div>

      {/* Aspect ratio presets */}
      {stringPresets.length > 0 && (
        <div className={classes.section}>
          <ToggleButtonGroup
            value={selectedPreset}
            exclusive
            onChange={handlePresetChange}
            className={classes.buttonGroup}
          >
            {stringPresets.map(preset => (
              <ToggleButton
                key={preset}
                value={preset}
                className={classes.button}
              >
                <div className={classes.buttonContent}>
                  <AspectRatioGlyph
                    aspectRatio={preset as AspectRatio}
                    size={16}
                  />
                  <span>
                    {getAspectRatioLabel(preset as AspectRatioOption)}
                  </span>
                </div>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      )}

      <div className={classes.section}>
        <ToggleButton
          value="custom"
          selected={isCustomActive}
          onClick={handleCustomToggle}
          className={classes.customButton}
        >
          <div className={classes.customButtonContent}>
            <AspectRatioGlyph
              aspectRatio={isCustomActive ? value : { w: 1, h: 1 }}
              size={16}
            />
            <span>Custom</span>
          </div>
        </ToggleButton>
      </div>

      {/* Custom Inputs */}
      {isCustomActive && (
        <Box className={classes.customInputs}>
          <TextField
            type="number"
            label={t('Width')}
            value={value.w}
            onChange={handleCustomWidthChange}
            variant="outlined"
            size="small"
            inputProps={{
              min: 0.1,
              max: 100,
              step: 0.1,
            }}
          />
          <span className={classes.colon}>:</span>
          <TextField
            type="number"
            label={t('Height')}
            value={value.h}
            onChange={handleCustomHeightChange}
            variant="outlined"
            size="small"
            inputProps={{
              min: 0.1,
              max: 100,
              step: 0.1,
            }}
          />
        </Box>
      )}
    </div>
  );
}

export default AspectRatioSelector;
