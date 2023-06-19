import React, { forwardRef, Ref } from 'react';
import { Button } from '@material-ui/core';

interface DateSelectorInputProps {
  value?: string;
  onClick?: () => void;
}

const DateSelectorInput = forwardRef(
  (
    { value, onClick }: DateSelectorInputProps,
    ref?: Ref<HTMLButtonElement>,
  ) => {
    return (
      <Button
        variant="outlined"
        style={{ color: '#101010', fontWeight: 'bold' }}
        onClick={onClick}
        ref={ref}
      >
        {value}
      </Button>
    );
  },
);

export default DateSelectorInput;
