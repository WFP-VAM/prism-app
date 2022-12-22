import { Box, Button, CircularProgress, withStyles } from '@material-ui/core';
import moment from 'moment';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WMSLayerProps } from '../../../config/types';
import { dateRangeSelector } from '../../../context/mapStateSlice/selectors';
import { useSafeTranslation } from '../../../i18n';
import { DEFAULT_DATE_FORMAT } from '../../../utils/name-utils';
import { downloadGeotiff, Extent } from '../Layers/raster-utils';

const StyledButton = withStyles(() => ({
  root: {
    marginTop: '0.4rem',
    marginBottom: '0.1rem',
    fontSize: '0.7rem',
  },
}))(Button);

interface IProps {
  layer: WMSLayerProps;
  extent?: Extent;
}

function StacRasterDownloadButton({ layer, extent }: IProps) {
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
    <StyledButton
      variant="contained"
      color="primary"
      size="small"
      disabled={isLoading}
      onClick={() => handleDownload()}
      fullWidth
      style={{ maxHeight: '30px' }}
    >
      <Box display="flex" alignItems="center">
        <Box>{t('Download')}</Box>
        {isLoading && (
          <Box display="flex" alignItems="center">
            <CircularProgress size="20px" />
          </Box>
        )}
      </Box>
    </StyledButton>
  );
}

export default StacRasterDownloadButton;
