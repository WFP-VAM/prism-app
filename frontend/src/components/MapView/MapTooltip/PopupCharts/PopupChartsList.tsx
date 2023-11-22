import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { isAdminBoundary } from 'components/MapView/utils';
import { appConfig } from 'config';
import { AdminLevelType, WMSLayerProps } from 'config/types';
import {
  DatasetRequestParams,
  datasetSelector,
  loadDataset,
} from 'context/datasetStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { t } from 'i18next';
import React, { memo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
  setShowDataset: React.Dispatch<React.SetStateAction<boolean>>;
  availableAdminLevels: AdminLevelType[];
}

const PopupChartsList = ({
  filteredChartLayers,
  adminLevelsNames,
  setAdminLevel,
  availableAdminLevels,
  setShowDataset,
  classes,
}: PopupChartsListProps) => {
  const dispatch = useDispatch();
  const { title, data: dataset, datasetParams } = useSelector(datasetSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  useEffect(() => {
    if (!datasetParams || !selectedDate) {
      return;
    }

    if (isAdminBoundary(datasetParams)) {
      const { code: adminCode, level } = datasetParams.boundaryProps[
        datasetParams.id
      ];
      const requestParams: DatasetRequestParams = {
        id: datasetParams.id,
        level,
        adminCode: adminCode || appConfig.countryAdmin0Id,
        boundaryProps: datasetParams.boundaryProps,
        url: datasetParams.url,
        serverLayerName: datasetParams.serverLayerName,
        datasetFields: datasetParams.datasetFields,
      };
      dispatch(loadDataset(requestParams));
    } else {
      const requestParams: DatasetRequestParams = {
        date: selectedDate,
        externalId: datasetParams.externalId,
        triggerLevels: datasetParams.triggerLevels,
        baseUrl: datasetParams.baseUrl,
      };
      dispatch(loadDataset(requestParams));
    }
  }, [datasetParams, dispatch, selectedDate]);

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
      {dataset && (
        <Button
          variant="text"
          size="small"
          className={classes.selectLevelButton}
          onClick={() => setShowDataset(true)}
        >
          <div className={classes.selectLevelButtonValue}>
            <FontAwesomeIcon icon={faChartBar} />
            <div className={classes.selectLevelButtonText}>{t(title)}</div>
          </div>
        </Button>
      )}
    </div>
  );
};

export default memo(withStyles(styles)(PopupChartsList));
