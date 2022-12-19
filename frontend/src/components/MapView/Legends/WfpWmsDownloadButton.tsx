import { Box, Button, CircularProgress } from '@material-ui/core';
import moment from 'moment';
import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const { startDate: selectedDate } = useSelector(dateRangeSelector);
  const dispatch = useDispatch();

  const handleDownload = () => {
    setIsLoading(true);
    downloadGeotiff(
      layer.serverLayerName,
      extent,
      moment(selectedDate).format(DEFAULT_DATE_FORMAT),
      dispatch,
      () => setIsLoading(false),
    );
  };

  return (
    <Button
      variant="contained"
      color="primary"
      size="small"
      disabled={isLoading}
      onClick={() => handleDownload()}
      fullWidth
    >
      <Box display="flex" alignItems="center">
        <Box>{t('Download WFP GeoTiff')}</Box>
        {isLoading && (
          <Box>
            <CircularProgress />
          </Box>
        )}
      </Box>
    </Button>
  );
}

export default WfpWmsDownloadButton;
