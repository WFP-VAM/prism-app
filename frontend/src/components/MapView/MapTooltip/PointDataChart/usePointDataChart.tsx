import {
  DatasetRequestParams,
  datasetSelector,
  loadDataset,
} from 'context/datasetStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { appConfig } from 'config';
import { isAdminBoundary } from '../../utils';

const usePointDataChart = () => {
  const dispatch = useDispatch();
  const { data: dataset, datasetParams, isLoading } = useSelector(
    datasetSelector,
  );
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

  return { dataset, isLoading };
};

export default usePointDataChart;
