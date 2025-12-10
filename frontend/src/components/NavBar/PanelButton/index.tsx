import { Button, IconButton, Badge, Typography } from '@material-ui/core';
import React from 'react';
import { ExpandMore } from '@material-ui/icons';
import { black, cyanBlue } from 'muiTheme';
import useLayers from 'utils/layers-utils';
import { useSelector } from 'react-redux';
import { analysisResultSelector } from 'context/analysisResultStateSlice';
import { Panel } from 'config/types';

function PanelButton({
  panel,
  selected,
  handleClick,
  isMobile,
  buttonText,
}: {
  panel: any;
  selected: boolean;
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  isMobile: boolean;
  buttonText: string;
}) {
  const { numberOfActiveLayers } = useLayers();
  const analysisData = useSelector(analysisResultSelector);
  const badgeContent = numberOfActiveLayers + Number(Boolean(analysisData));
  const Wrap =
    badgeContent >= 1 && panel.panel === Panel.Layers
      ? // eslint-disable-next-line react/no-unused-prop-types
        ({ children }: { children: React.ReactNode }) => (
          <Badge
            anchorOrigin={{
              horizontal: 'left',
              vertical: 'top',
            }}
            overlap="rectangular"
            badgeContent={badgeContent}
            color="secondary"
          >
            {children}
          </Badge>
        )
      : ({ children }: { children: React.ReactNode }) => children;

  const commonStyles = {
    backgroundColor: selected ? cyanBlue : undefined,
    color: selected ? black : 'white',
  };

  const renderButtonContent = (
    <Typography
      style={{
        color: selected ? black : '#FFFF',
        textTransform: 'none',
      }}
    >
      {buttonText}
    </Typography>
  );

  return isMobile ? (
    <IconButton
      size="small"
      style={commonStyles}
      onClick={handleClick}
      aria-label={buttonText}
    >
      <Wrap>{panel.icon}</Wrap>
    </IconButton>
  ) : (
    <Button
      style={commonStyles}
      startIcon={<Wrap>{panel.icon}</Wrap>}
      endIcon={panel.children ? <ExpandMore fontSize="small" /> : null}
      onClick={handleClick}
    >
      {renderButtonContent}
    </Button>
  );
}

export default PanelButton;
