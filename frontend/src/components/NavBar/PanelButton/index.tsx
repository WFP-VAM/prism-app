import { ExpandMore } from '@mui/icons-material';
import { Badge, Button, IconButton, Typography } from '@mui/material';
import { Panel } from 'config/types';
import { analysisResultSelector } from 'context/analysisResultStateSlice';
import { black, cyanBlue } from 'muiTheme';
import React from 'react';
import { useSelector } from 'react-redux';
import useLayers from 'utils/layers-utils';

function PanelButton({
  panel,
  selected,
  handleClick,
  isMobile,
  buttonText,
  disabled = false,
}: {
  panel: any;
  selected: boolean;
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
  isMobile: boolean;
  buttonText: string;
  disabled?: boolean;
}) {
  const { numberOfActiveLayers } = useLayers();
  const analysisData = useSelector(analysisResultSelector);
  const badgeContent = numberOfActiveLayers + Number(Boolean(analysisData));
  const Wrap =
    badgeContent >= 1 && panel.panel === Panel.Layers
      ? ({ children }: { children: React.ReactNode }) => (
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
    backgroundColor: selected && !disabled ? cyanBlue : undefined,
    color: selected && !disabled ? black : 'white',
    opacity: disabled ? 0.45 : undefined,
  };

  const renderButtonContent = (
    <Typography
      style={{
        color: selected && !disabled ? black : '#FFFF',
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
      disabled={disabled}
    >
      <Wrap>{panel.icon}</Wrap>
    </IconButton>
  ) : (
    <Button
      style={commonStyles}
      startIcon={<Wrap>{panel.icon}</Wrap>}
      endIcon={panel.children ? <ExpandMore fontSize="small" /> : null}
      onClick={handleClick}
      disabled={disabled}
    >
      {renderButtonContent}
    </Button>
  );
}

export default PanelButton;
