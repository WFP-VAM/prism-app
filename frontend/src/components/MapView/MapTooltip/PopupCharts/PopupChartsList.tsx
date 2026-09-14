import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button } from '@mui/material';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import { t } from 'i18next';
import React, { memo } from 'react';
import { useEffectiveCountryAdmin0Id } from 'utils/universal-country-admin';

import {
  selectChartContainerSx,
  selectLevelButtonSx,
  selectLevelButtonTextSx,
  selectLevelButtonValueSx,
} from '../mapTooltipStyles';
import { hasChartAdminId } from './utils';

interface PopupChartsListProps {
  filteredChartLayers: WMSLayerProps[];
  adminLevelsNames: () => string[];
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  availableAdminLevels: AdminLevelType[];
  selectorProperties?: GeoJSON.GeoJsonProperties;
}

const PopupChartsList = memo(
  ({
    filteredChartLayers,
    adminLevelsNames,
    setAdminLevel,
    availableAdminLevels,
    selectorProperties,
  }: PopupChartsListProps) => {
    const countryAdmin0Id = useEffectiveCountryAdmin0Id();
    const baseAdminLevel = Math.min(...availableAdminLevels);

    return (
      <Box sx={selectChartContainerSx}>
        {filteredChartLayers.map(layer =>
          adminLevelsNames().map((level, index) => {
            const chartLevel = (index + baseAdminLevel) as AdminLevelType;
            if (
              !hasChartAdminId(
                layer,
                selectorProperties,
                chartLevel,
                countryAdmin0Id,
              )
            ) {
              return null;
            }

            return (
              <Button
                key={`${layer.id}-${chartLevel}`}
                variant="text"
                size="small"
                sx={selectLevelButtonSx}
                onClick={() => setAdminLevel(chartLevel)}
              >
                <Box sx={selectLevelButtonValueSx}>
                  <FontAwesomeIcon icon={faChartBar} />
                  <Box sx={selectLevelButtonTextSx}>
                    {level} - {t(layer.title)}
                  </Box>
                </Box>
              </Button>
            );
          }),
        )}
      </Box>
    );
  },
);

export default PopupChartsList;
