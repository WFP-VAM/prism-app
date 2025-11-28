import {
  DatasetRequestParams,
  datasetSelector,
  loadDataset,
} from 'context/datasetStateSlice';
import { dateRangeSelector } from 'context/mapStateSlice/selectors';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'context/hooks';
import { appConfig } from 'config';
import {
  GoogleFloodParams,
  isGoogleFloodDatasetParams,
} from 'utils/google-flood-utils';
import { isAdminBoundary } from 'utils/admin-utils';

const usePointDataChart = () => {
  const dispatch = useDispatch();
  const {
    data: dataset,
    datasetParams,
    isLoading,
  } = useSelector(datasetSelector);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);

  useEffect(() => {
    if (datasetParams && selectedDate) {
      if (isAdminBoundary(datasetParams)) {
        const { code: adminCode, level } =
          datasetParams.boundaryProps[datasetParams.id];
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
        if (isGoogleFloodDatasetParams(datasetParams as GoogleFloodParams)) {
          const requestParams = datasetParams as GoogleFloodParams;
          dispatch(loadDataset(requestParams));
          return;
        }

        // Assumes EWSDataset
        const requestParams: DatasetRequestParams = {
          date: selectedDate,
          ...datasetParams,
        };
        dispatch(loadDataset(requestParams));
      }
    }
  }, [datasetParams, dispatch, selectedDate]);

  return { dataset, isLoading };
};

export default usePointDataChart;
