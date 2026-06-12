import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button } from '@mui/material';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import { t } from 'i18next';
import React, { memo } from 'react';

import {
  selectChartContainerSx,
  selectLevelButtonSx,
  selectLevelButtonTextSx,
  selectLevelButtonValueSx,
} from '../mapTooltipStyles';

interface PopupChartsListProps {
  filteredChartLayers: WMSLayerProps[];
  adminLevelsNames: () => string[];
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  availableAdminLevels: AdminLevelType[];
}

const PopupChartsList = memo(
  ({
    filteredChartLayers,
    adminLevelsNames,
    setAdminLevel,
    availableAdminLevels,
  }: PopupChartsListProps) => {
    return (
      <Box sx={selectChartContainerSx}>
        {filteredChartLayers.map(layer =>
          adminLevelsNames().map((level, index) => (
            <Button
              key={level}
              variant="text"
              size="small"
              sx={selectLevelButtonSx}
              onClick={() =>
                setAdminLevel(
                  (index + Math.min(...availableAdminLevels)) as AdminLevelType,
                )
              }
            >
              <Box sx={selectLevelButtonValueSx}>
                <FontAwesomeIcon icon={faChartBar} />
                <Box sx={selectLevelButtonTextSx}>
                  {level} - {t(layer.title)}
                </Box>
              </Box>
            </Button>
          )),
        )}
      </Box>
    );
  },
);

export default PopupChartsList;
