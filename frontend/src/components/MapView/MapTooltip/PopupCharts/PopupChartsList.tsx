import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import { t } from 'i18next';
import React, { memo } from 'react';

const styles = () =>
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
  });

interface PopupChartsListProps extends WithStyles<typeof styles> {
  filteredChartLayers: WMSLayerProps[];
  adminLevelsNames: () => string[];
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  availableAdminLevels: AdminLevelType[];
}

function PopupChartsList({
  filteredChartLayers,
  adminLevelsNames,
  setAdminLevel,
  availableAdminLevels,
  classes,
}: PopupChartsListProps) {
  return (
    <div className={classes.selectChartContainer}>
      {filteredChartLayers.map(layer =>
        adminLevelsNames().map((level, index) => (
          <Button
            key={level}
            variant="text"
            size="small"
            className={classes.selectLevelButton}
            onClick={() =>
              setAdminLevel(
                (index + Math.min(...availableAdminLevels)) as AdminLevelType,
              )
            }
          >
            <div className={classes.selectLevelButtonValue}>
              <FontAwesomeIcon icon={faChartBar} />
              <div className={classes.selectLevelButtonText}>
                {level} - {t(layer.title)}
              </div>
            </div>
          </Button>
        )),
      )}
    </div>
  );
}

export default memo(withStyles(styles)(PopupChartsList));
