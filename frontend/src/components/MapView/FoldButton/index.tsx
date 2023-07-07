import {
  Badge,
  Button,
  makeStyles,
  Theme,
  Tooltip,
  Typography,
} from '@material-ui/core';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSafeTranslation } from '../../../i18n';
import { analysisResultSelector } from '../../../context/analysisResultStateSlice';

interface IProps {
  isPanelHidden: boolean;
  setIsPanelHidden: React.Dispatch<React.SetStateAction<boolean>>;
  activeLayers: number;
}

const useStyles = makeStyles((theme: Theme) => ({
  foldedStyle: {
    boxShadow: theme.shadows[2],
    height: 41.8,
    minWidth: 30,
    width: 41.8,
    marginTop: '3px',
    marginLeft: '20px',
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

const FoldButton = ({
  isPanelHidden,
  setIsPanelHidden,
  activeLayers,
}: IProps) => {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const analysisData = useSelector(analysisResultSelector);

  const onClick = useCallback(() => {
    setIsPanelHidden(value => !value);
  }, [setIsPanelHidden]);

  const badgeContent = useMemo(() => {
    if (!analysisData) {
      return activeLayers;
    }
    return activeLayers + 1;
  }, [activeLayers, analysisData]);

  const renderedIcon = useMemo(() => {
    if (isPanelHidden && badgeContent >= 1) {
      return (
        <Badge
          anchorOrigin={{
            horizontal: 'right',
            vertical: 'top',
          }}
          badgeContent={badgeContent}
          color="secondary"
        >
          <DragIndicatorIcon />
        </Badge>
      );
    }
    return <DragIndicatorIcon />;
  }, [badgeContent, isPanelHidden]);

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
        {renderedIcon}
      </Button>
    </Tooltip>
  );
};

export default FoldButton;
