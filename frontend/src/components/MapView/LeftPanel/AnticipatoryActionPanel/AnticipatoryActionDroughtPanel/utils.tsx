/* eslint-disable react-refresh/only-export-components */
import {
  Checkbox,
  CheckboxProps,
  FormControlLabel,
  FormControlLabelProps,
  Radio,
  RadioProps,
  useRadioGroup,
  withStyles,
} from '@material-ui/core';
import { black, borderGray, lightGrey } from 'muiTheme';
import { useSafeTranslation } from 'i18n';
import {
  AACategoryType,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionDataRow,
} from 'context/anticipatoryAction/AADroughtStateSlice/types';
import {
  LIGHT_BLUE_HEX,
  LIGHT_GREEN_HEX,
} from 'components/MapView/DateSelector/TimelineItems/utils';
import AAIcon from '../AAIcon';

const StyledRadio = withStyles({
  root: {
    '&$checked': {
      color: black,
    },
    padding: '0.25rem',
  },
})((props: RadioProps) => <Radio color="default" {...props} />);

export const StyledRadioLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '32px',
    height: '1.75rem',
    marginLeft: 0,
    marginRight: '0.5rem',
  },
})(({ label, ...props }: Omit<FormControlLabelProps, 'control'>) => {
  const { t } = useSafeTranslation();
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === props.value;

  const colorTags: { [key: string]: string } = {
    'Window 1': LIGHT_BLUE_HEX,
    'Window 2': LIGHT_GREEN_HEX,
  };

  const color = colorTags[label as string] || undefined;

  return (
    <FormControlLabel
      style={{ background: checked ? lightGrey : undefined }}
      label={
        <span style={{ marginRight: '1rem' }}>
          {color ? (
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: color,
                marginRight: '0.5rem',
              }}
            />
          ) : null}
          {typeof label === 'string' ? t(label) : label}
        </span>
      }
      control={<StyledRadio />}
      {...props}
    />
  );
});

const StyledCheckbox = withStyles({
  root: {
    '&$checked': {
      color: black,
    },
    padding: '0.2rem',
  },
})((props: CheckboxProps) => <Checkbox color="default" {...props} />);

export const StyledCheckboxLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '2px',
    height: '1.75rem',
    marginLeft: 0,
  },
})(
  ({
    label,
    checkBoxProps,
    ...props
  }: Omit<FormControlLabelProps, 'control'> & {
    checkBoxProps: CheckboxProps;
  }) => (
    <FormControlLabel
      style={{ background: checkBoxProps.checked ? lightGrey : undefined }}
      label={<span style={{ marginRight: '0.5rem' }}>{label}</span>}
      control={<StyledCheckbox {...checkBoxProps} />}
      {...props}
    />
  ),
);

const AACategoryPhaseMap: { [key: string]: any } = {
  na: {
    color: '#F1F1F1',
    iconProps: { topText: 'na', bottomText: '-', color: 'black' },
  },
  ny: {
    color: '#F1F1F1', // Note: Special handling required for 'ny' in getAAColor for non-layer usage
    iconProps: { topText: 'ny', bottomText: '-', color: 'black' },
  },
  Severe: {
    Set: {
      color: '#831F00',
      iconProps: { topText: 'S', bottomText: 'SEV', color: 'white' },
    },
    Ready: {
      color: '#E63701',
      iconProps: { topText: 'R', bottomText: 'SEV', color: 'white' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'SEV', color: 'black' },
    },
  },
  Moderate: {
    Set: {
      color: '#FF8934',
      iconProps: { topText: 'S', bottomText: 'MOD', color: 'black' },
    },
    Ready: {
      color: '#FFD52D',
      iconProps: { topText: 'R', bottomText: 'MOD', color: 'black' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'MOD', color: 'black' },
    },
  },
  Mild: {
    Set: {
      color: '#FFF503',
      iconProps: { topText: 'S', bottomText: 'MIL', color: 'black' },
    },
    Ready: {
      color: '#FFFCB3',
      iconProps: { topText: 'R', bottomText: 'MIL', color: 'black' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'MIL', color: 'black' },
    },
  },
  Normal: {
    Set: {
      color: '#FFF503',
      iconProps: { topText: 'S', bottomText: 'BNO', color: 'black' },
    },
    Ready: {
      color: '#FFFCB3',
      iconProps: { topText: 'R', bottomText: 'BNO', color: 'black' },
    },
    na: {
      color: '#F1F1F1',
      iconProps: { topText: 'na', bottomText: 'BNO', color: 'black' },
    },
  },
};

export function getAAColor(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  const categoryData = AACategoryPhaseMap[category];
  if (category === 'ny' && !forLayer) {
    return `repeating-linear-gradient(
      -45deg,
      #F1F1F1,
      #F1F1F1 10px,
      white 10px,
      white 20px
    )`;
  }
  if (categoryData.color) {
    return categoryData.color;
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return phaseData.color;
}

export function getAAIcon(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer?: boolean,
) {
  const background = getAAColor(category, phase, forLayer);

  const categoryData = AACategoryPhaseMap[category];
  if (categoryData.iconProps) {
    const iconProps = forLayer
      ? { ...categoryData.iconProps, bottomText: undefined }
      : categoryData.iconProps;
    return (
      <AAIcon
        background={background}
        fillBackground={!forLayer}
        {...iconProps}
      />
    );
  }
  const phaseData = categoryData[phase];
  if (!phaseData) {
    throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
  return (
    <AAIcon
      background={background}
      fillBackground={!forLayer}
      {...phaseData.iconProps}
    />
  );
}

export function AADataSeverityOrder(
  category: AnticipatoryActionDataRow['category'],
  phase: AnticipatoryActionDataRow['phase'],
  bonus: number = 100,
) {
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseBonus = phase === 'Set' ? bonus : 0;

  return catIndex * 10 + phaseBonus;
}
