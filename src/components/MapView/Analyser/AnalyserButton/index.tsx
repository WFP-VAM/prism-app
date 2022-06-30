import React from 'react';
import {
  Button,
  Typography,
  createStyles,
  withStyles,
  WithStyles,
} from '@material-ui/core';

const AnalyserButton = ({
  onClick,
  disabled,
  classes,
  label,
}: AnalyserButtonProps) => {
  return (
    <Button
      className={classes.innerAnalysisButton}
      onClick={onClick}
      disabled={disabled}
    >
      <Typography variant="body2">{label}</Typography>
    </Button>
  );
};

const styles = () =>
  createStyles({
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
      margin: '10px',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  });

interface AnalyserButtonProps extends WithStyles<typeof styles> {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

export default withStyles(styles)(AnalyserButton);
