import React from 'react';
import {
  Button,
  Typography,
  createStyles,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { ArrowDropDown, BarChart } from '@material-ui/icons';
import { useSafeTranslation } from '../../../../i18n';

const OpenAnalyserFormButton = ({
  classes,
  onClick,
}: OpenAnalyserFormButtonProps) => {
  const { t } = useSafeTranslation();
  return (
    <Button variant="contained" color="primary" onClick={onClick}>
      <BarChart fontSize="small" />
      <Typography variant="body2" className={classes.analyserLabel}>
        {t('Run Analysis')}
      </Typography>
      <ArrowDropDown fontSize="small" />
    </Button>
  );
};

const styles = () =>
  createStyles({
    analyserLabel: {
      marginLeft: '10px',
    },
  });

interface OpenAnalyserFormButtonProps extends WithStyles<typeof styles> {
  onClick: () => void;
}

export default withStyles(styles)(OpenAnalyserFormButton);
