import {
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
  checked: {},
})((props: RadioProps) => <Radio color="default" {...props} />);

export const StyledRadioLabel = withStyles({
  root: {
    border: `1px solid ${borderGray}`,
    borderRadius: '32px',
    height: '1.75rem',
    marginLeft: 0,
  },
  checked: {},
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

export function getAAIcon(category: AACategoryType, phase: AAPhaseType) {
  switch (category) {
    case 'na':
      return (
        <AAIcon
          background="#F1F1F1"
          topText="na"
          bottomText="-"
          color="black"
        />
      );
    case 'ny':
      return (
        <AAIcon
          background={`repeating-linear-gradient(
            -45deg,
            #F1F1F1,
            #F1F1F1 10px,
            white 10px,
            white 20px
            )`}
          topText="ny"
          bottomText="-"
          color="black"
        />
      );
    case 'Severo':
      if (phase === 'Set') {
        return (
          <AAIcon
            background="#831F00"
            topText="S"
            bottomText="SEV"
            color="white"
          />
        );
      }
      if (phase === 'Ready') {
        return (
          <AAIcon
            background="#E63701"
            topText="R"
            bottomText="SEV"
            color="white"
          />
        );
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    case 'Moderado':
      if (phase === 'Set') {
        return (
          <AAIcon
            background="#FF8934"
            topText="S"
            bottomText="MOD"
            color="black"
          />
        );
      }
      if (phase === 'Ready') {
        return (
          <AAIcon
            background="#FFD52D"
            topText="R"
            bottomText="MOD"
            color="black"
          />
        );
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    case 'Leve':
      if (phase === 'Set') {
        return (
          <AAIcon
            background="#FFF503"
            topText="S"
            bottomText="MIL"
            color="black"
          />
        );
      }
      if (phase === 'Ready') {
        return (
          <AAIcon
            background="#FFFCB3"
            topText="R"
            bottomText="MIL"
            color="black"
          />
        );
      }
      throw new Error(`Icon not implemented: ${category}, ${phase}`);

    default:
      throw new Error(`Icon not implemented: ${category}, ${phase}`);
  }
}

export function AADataSeverityOrder(
  category: AnticipatoryActionData['category'],
  phase: AnticipatoryActionData['phase'],
) {
  if (category === 'na') {
    return 1000;
  }
  if (category === 'ny') {
    return 2000;
  }
  const catIndex = AAcategory.findIndex(x => x === category);
  const phaseIndex = AAPhase.findIndex(x => x === phase);

  return catIndex * 10 + phaseIndex;
}
