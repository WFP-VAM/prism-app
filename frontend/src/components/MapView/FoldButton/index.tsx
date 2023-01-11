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
  isPanelHidden: boolean;
  setIsPanelHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

const useStyles = makeStyles((theme: Theme) => ({
  foldedStyle: {
    boxShadow: theme.shadows[2],
    height: 44,
    minWidth: 30,
    width: 44,
    marginTop: 'calc(1em + 15px)',
    marginLeft: '34px',
    backgroundColor: '#3C3F40',
    zIndex: 5,
  },
  unfoldedStyle: {
    boxShadow: 'unset',
    zIndex: theme.zIndex.drawer,
    height: 48,
    minWidth: 30,
    width: 48,
    backgroundColor: '#3C3F40',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
}));

function FoldButton({ isPanelHidden, setIsPanelHidden }: IProps) {
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
        classes={{
          root: isPanelHidden ? classes.foldedStyle : classes.unfoldedStyle,
        }}
        size="medium"
        onClick={onClick}
      >
        <DragIndicatorIcon />
      </Button>
    </Tooltip>
  );
}

export default FoldButton;
