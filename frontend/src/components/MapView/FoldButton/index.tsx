import { Button, makeStyles, Theme } from '@material-ui/core';
import React from 'react';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';

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

  const onClick = () => {
    setIsPanelHidden(value => !value);
  };

  return (
    <Button
      variant="contained"
      color="primary"
      classes={{ root: classes.foldButton }}
      size="medium"
      onClick={onClick}
    >
      <DragIndicatorIcon />
    </Button>
  );
}

export default FoldButton;
