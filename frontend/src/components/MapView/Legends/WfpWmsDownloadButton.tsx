import { Button } from '@material-ui/core';
import moment from 'moment';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WMSLayerProps } from '../../../config/types';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { DEFAULT_DATE_FORMAT } from '../../../utils/name-utils';
import { downloadGeotiff, Extent } from '../Layers/raster-utils';

interface IProps {
  layer: WMSLayerProps;
  extent?: Extent;
}

function WfpWmsDownloadButton({ layer, extent }: IProps) {
  const { t } = useSafeTranslation();
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  const handleDownload = () => {
    downloadGeotiff(
      layer.serverLayerName,
      extent,
      moment(selectedDate).format(DEFAULT_DATE_FORMAT),
      dispatch,
    );
  };

  return (
    <Button
      variant="contained"
      color="primary"
      size="small"
      onClick={() => handleDownload()}
      fullWidth
    >
      {t('Download WFP GeoTiff')}
    </Button>
  );
}

export default WfpWmsDownloadButton;
