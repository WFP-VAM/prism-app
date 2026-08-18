import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, createStyles, makeStyles } from '@material-ui/core';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import { t } from 'i18next';
import React, { memo } from 'react';
import { useEffectiveCountryAdmin0Id } from 'utils/universal-country-admin';

import { hasChartAdminId } from './utils';

const useStyles = makeStyles(() =>
  createStyles({
    selectChartContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'start',
    },
    selectLevelButton: {
      textTransform: 'none',
    },
    selectLevelButtonValue: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      justifyContent: 'start',
    },
    selectLevelButtonText: {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      maxWidth: '280px',
    },
  }),
);

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
    const classes = useStyles();
    const countryAdmin0Id = useEffectiveCountryAdmin0Id();
    const baseAdminLevel = Math.min(...availableAdminLevels);

    return (
      <div className={classes.selectChartContainer}>
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
                className={classes.selectLevelButton}
                onClick={() => setAdminLevel(chartLevel)}
              >
                <div className={classes.selectLevelButtonValue}>
                  <FontAwesomeIcon icon={faChartBar} />
                  <div className={classes.selectLevelButtonText}>
                    {level} - {t(layer.title)}
                  </div>
                </div>
              </Button>
            );
          }),
        )}
      </div>
    );
  },
);

export default PopupChartsList;
