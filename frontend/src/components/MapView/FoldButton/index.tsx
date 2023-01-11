import {
  Button,
  makeStyles,
  Theme,
  Tooltip,
  Typography,
} from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import React from 'react';
import { useSafeTranslation } from '../../../i18n';

interface IProps {
  setIsPanelHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

const useStyles = makeStyles((theme: Theme) => ({
  foldButton: {
    boxShadow: theme.shadows[2],
    height: 44,
    minWidth: 30,
    width: 32,
    marginTop: '1rem',
    marginRight: '0.5rem',
  },
}));

function FoldButton({ setIsPanelHidden }: IProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const onClick = () => {
    setIsPanelHidden(value => !value);
  };

  return (
    <Tooltip title={<Typography>{t('Menu')}</Typography>} arrow>
      <Button
        variant="contained"
        color="primary"
        classes={{ root: classes.foldButton }}
        size="medium"
        onClick={onClick}
      >
        <DragIndicatorIcon />
      </Button>
    </Tooltip>
  );
}

export default FoldButton;
