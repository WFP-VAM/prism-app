import { Button, Typography } from '@mui/material';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { useSelector } from 'react-redux';

import { aaCommonSx } from '../../aaPanelStyles';

function DownloadGeoJSONButton() {
  const { t } = useSafeTranslation();
  const parsedStormData = useSelector(AADataSelector);

  const handleDownloadGeoJSON = () => {
    if (!parsedStormData.mergedGeoJSON || !parsedStormData.forecastDetails) {
      return;
    }

    const dataStr = JSON.stringify(parsedStormData.mergedGeoJSON);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');

    link.href = url;
    const date =
      parsedStormData.forecastDetails.reference_time.split(':00Z')[0];

    link.download = `${parsedStormData.forecastDetails?.cyclone_name || 'cyclone'}_${date}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!parsedStormData.mergedGeoJSON || !parsedStormData.forecastDetails) {
    return null;
  }

  return (
    <Button
      style={{
        width: '50%',
        margin: '1rem auto',
      }}
      sx={aaCommonSx.footerButton}
      variant="outlined"
      fullWidth
      onClick={handleDownloadGeoJSON}
    >
      <Typography>{t('Download GeoJSON')}</Typography>
    </Button>
  );
}

export default DownloadGeoJSONButton;
