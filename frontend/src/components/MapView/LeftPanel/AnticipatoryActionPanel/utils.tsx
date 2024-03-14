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
import {
  AACategoryType,
  AAPhase,
  AAPhaseType,
  AAcategory,
  AnticipatoryActionData,
} from 'context/anticipatoryActionStateSlice';
import { black, borderGray, gray } from 'muiTheme';
import React from 'react';
import AAIcon from './HomeTable/AAIcon';

const StyledRadio = withStyles({
  root: {
    '&$checked': {
      color: black,
    },
  },
})((props: RadioProps) => <Radio color="default" {...props} />);

export const StyledRadioLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '32px',
    height: '1.75rem',
    marginLeft: 0,
  },
})(({ label, ...props }: Omit<FormControlLabelProps, 'control'>) => {
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === props.value;

  return (
    <FormControlLabel
      style={{ background: checked ? gray : undefined }}
      label={<span style={{ marginRight: '1rem' }}>{label}</span>}
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
    padding: '0.25rem',
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
  }) => {
    return (
      <FormControlLabel
        style={{ background: checkBoxProps.checked ? gray : undefined }}
        label={<span style={{ marginRight: '0.5rem' }}>{label}</span>}
        control={<StyledCheckbox {...checkBoxProps} />}
        {...props}
      />
    );
  },
);

export function getAAAvailableDates(data: AnticipatoryActionData[]) {
  const datesAsMap = data.reduce((acc, curr, index) => {
    const window = acc[curr.windows];
    const newEntry = new Date(curr.date).getTime();
    return {
      ...acc,
      [curr.windows]: window
        ? window.set(newEntry, newEntry)
        : new Map().set(newEntry, newEntry),
    };
  }, {} as { [key: string]: Map<number, number> });

  return Object.fromEntries(
    Object.entries(datesAsMap).map(x => [x[0], Array.from(x[1].keys())]),
  );
}

export function getAAColor(
  category: AACategoryType,
  phase: AAPhaseType,
  forLayer: boolean = false,
) {
  switch (category) {
    case 'na':
      return '#F1F1F1';
    case 'ny':
      return forLayer
        ? '#F1F1F1'
        : `repeating-linear-gradient(
        -45deg,
        #F1F1F1,
        #F1F1F1 10px,
        white 10px,
        white 20px
        )`;
    case 'Severo':
      if (phase === 'Set') {
        return '#831F00';
      }
      if (phase === 'Ready') {
        return '#E63701';
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    case 'Moderado':
      if (phase === 'Set') {
        return '#FF8934';
      }
      if (phase === 'Ready') {
        return '#FFD52D';
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    case 'Leve':
      if (phase === 'Set') {
        return '#FFF503';
      }
      if (phase === 'Ready') {
        return '#FFFCB3';
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    default:
      throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
}

export function getAAIcon(
  category: AACategoryType,
  phase: AAPhaseType,
  light?: boolean,
) {
  const background = light ? undefined : getAAColor(category, phase);
  const otherProps = (() => {
    switch (category) {
      case 'na':
        return {
          topText: 'na',
          bottomText: light ? undefined : '-',
          color: 'black',
        };
      case 'ny':
        return {
          topText: 'ny',
          bottomText: light ? undefined : '-',
          color: 'black',
        };
      case 'Severo':
        if (phase === 'Set') {
          return {
            topText: 'S',
            bottomText: 'SEV',
            color: 'white',
          };
        }
        if (phase === 'Ready') {
          return {
            topText: 'R',
            bottomText: 'SEV',
            color: 'white',
          };
        }
        throw new Error(`Icon not implemented: ${category}, ${phase}`);

      case 'Moderado':
        if (phase === 'Set') {
          return {
            topText: 'S',
            bottomText: 'MOD',
            color: 'black',
          };
        }
        if (phase === 'Ready') {
          return {
            topText: 'R',
            bottomText: 'MOD',
            color: 'black',
          };
        }
        throw new Error(`Icon not implemented: ${category}, ${phase}`);

      case 'Leve':
        if (phase === 'Set') {
          return {
            topText: 'S',
            bottomText: 'MIL',
            color: 'black',
          };
        }
        if (phase === 'Ready') {
          return {
            topText: 'R',
            bottomText: 'MIL',
            color: 'black',
          };
        }
        throw new Error(`Icon not implemented: ${category}, ${phase}`);

      default:
        throw new Error(`Icon not implemented: ${category}, ${phase}`);
    }
  })();

  return <AAIcon background={background} {...otherProps} />;
}

export function AADataSeverityOrder(
  category: AnticipatoryActionData['category'],
  phase: AnticipatoryActionData['phase'],
) {
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseIndex = AAPhase.findIndex(x => x === phase);

  return 1000 + catIndex * 10 + phaseIndex;
}
