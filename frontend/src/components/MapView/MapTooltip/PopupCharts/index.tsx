import { appConfig } from 'config';
import { AdminLevelType } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import {
  dateRangeSelector,
  layersSelector,
} from 'context/mapStateSlice/selectors';
import React, { memo, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapTooltipState } from 'context/tooltipStateSlice';
import i18n, { isEnglishLanguageSelected } from 'i18n';
import {
  DatasetRequestParams,
  datasetSelector,
  loadDataset,
} from 'context/datasetStateSlice';
import { isAdminBoundary } from 'components/MapView/utils';
import PopupAnalysisCharts from './PopupAnalysisCharts';
import DatasetChart from './PopupDatasetChart';
import ChartsList from './PopupChartsList';

const chartLayers = getWMSLayersWithChart();
const { multiCountry } = appConfig;
const availableAdminLevels: AdminLevelType[] = multiCountry
  ? [0, 1, 2]
  : [1, 2];

interface PopupChartsProps {
  popup: MapTooltipState;
  setPopupTitle: React.Dispatch<React.SetStateAction<string>>;
  adminLevel: AdminLevelType | undefined;
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  showDataset: boolean;
  setShowDataset: React.Dispatch<React.SetStateAction<boolean>>;
}

const PopupCharts = ({
  popup,
  setPopupTitle,
  adminLevel,
  setAdminLevel,
  showDataset,
  setShowDataset,
}: PopupChartsProps) => {
  const dispatch = useDispatch();

  const mapState = useSelector(layersSelector);

  // TODO - simplify logic once we revamp admin levels ojbect
  const adminLevelsNames = useCallback(() => {
    const locationName = isEnglishLanguageSelected(i18n)
      ? popup.locationName
      : popup.locationLocalName;
    const splitNames = locationName.split(', ');

    const adminLevelLimit =
      adminLevel === undefined
        ? availableAdminLevels.length
        : adminLevel + (multiCountry ? 1 : 0);
    // If adminLevel is undefined, return the whole array
    // eslint-disable-next-line fp/no-mutating-methods
    return splitNames.splice(0, adminLevelLimit);
  }, [adminLevel, popup.locationLocalName, popup.locationName]);

  const mapStateIds = mapState.map(item => item.id);
  const filteredChartLayers = chartLayers.filter(item =>
    mapStateIds.includes(item.id),
  );

  const { data: dataset, datasetParams } = useSelector(datasetSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  useEffect(() => {
    if (adminLevel !== undefined) {
      setPopupTitle(adminLevelsNames().join(', '));
    } else {
      setPopupTitle('');
    }
  }, [adminLevel, adminLevelsNames, setPopupTitle]);

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

  if (filteredChartLayers.length === 0 && !dataset) {
    return null;
  }

  return (
    <>
      {adminLevel === undefined && !showDataset && (
        <ChartsList
          adminLevelsNames={adminLevelsNames}
          availableAdminLevels={availableAdminLevels}
          dataset={dataset}
          filteredChartLayers={filteredChartLayers}
          setAdminLevel={setAdminLevel}
          setShowDataset={setShowDataset}
        />
      )}
      {adminLevel !== undefined && (
        <PopupAnalysisCharts
          adminLevel={adminLevel}
          onClose={setAdminLevel}
          adminLevelsNames={adminLevelsNames}
          filteredChartLayers={filteredChartLayers}
        />
      )}
      {showDataset && (
        <DatasetChart
          onClose={setShowDataset}
          adminLevelsNames={adminLevelsNames}
        />
      )}
    </>
  );
};

export default memo(PopupCharts);
