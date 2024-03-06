import {
  FormControlLabel,
  FormControlLabelProps,
  Radio,
  RadioProps,
  useRadioGroup,
  withStyles,
} from '@material-ui/core';
import { AnticipatoryActionData } from 'context/anticipatoryActionStateSlice';
import { black, borderGray, gray } from 'muiTheme';
import React from 'react';

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

export type Phase =
  | 'set_sev'
  | 'ready_sev'
  | 'set_mod'
  | 'ready_mod'
  | 'na'
  | 'ny';

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
