import { Badge, Box } from '@material-ui/core';
import { LayersOutlined } from '@material-ui/icons';
import { PanelSize } from 'config/types';
import { analysisResultSelector } from 'context/analysisResultStateSlice';
import { Panel } from 'context/leftPanelStateSlice';
import { t } from 'i18next';
import React from 'react';
import { useSelector } from 'react-redux';
import useLayers from 'utils/layers-utils';

interface TabLabelProps {
  tabValue: Panel;
  panelSize: PanelSize;
}
const TabLabel = ({ tabValue, panelSize }: TabLabelProps) => {
  const analysisData = useSelector(analysisResultSelector);
  const { numberOfActiveLayers } = useLayers();

  const layersBadgeContent = !analysisData
    ? numberOfActiveLayers
    : numberOfActiveLayers + 1;

  if (
    tabValue !== Panel.Layers &&
    panelSize !== PanelSize.folded &&
    layersBadgeContent >= 1
  ) {
    return (
      <Box display="flex">
        <Badge
          anchorOrigin={{
            horizontal: 'left',
            vertical: 'top',
          }}
          overlap="rectangular"
          badgeContent={layersBadgeContent}
          color="secondary"
        >
          <LayersOutlined style={{ verticalAlign: 'middle' }} />
          <Box ml={1}>{t('Layers')}</Box>
        </Badge>
      </Box>
    );
  }
  return (
    <Box display="flex">
      <LayersOutlined style={{ verticalAlign: 'middle' }} />
      <Box ml={1}>{t('Layers')}</Box>
    </Box>
  );
};

export default TabLabel;
