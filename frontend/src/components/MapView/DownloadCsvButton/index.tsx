import { Button } from '@mui/material';
import { usePostHog } from '@posthog/react';
import { t } from 'i18next';
import { downloadChartsToCsv } from 'utils/csv-utils';

import { downloadButtonSx } from '../panelButtonStyles';

interface DownloadChartCSVButtonProps {
  filesData: {
    fileName: string;
    data: { [key: string]: any[] };
  }[];
  disabled?: boolean;
}

function DownloadChartCSVButton({
  filesData,
  disabled = false,
}: DownloadChartCSVButtonProps) {
  const posthog = usePostHog();
  const buildDataToDownload: () => [{ [key: string]: any[] }, string][] = () =>
    filesData.map(fileData => [fileData.data, fileData.fileName]);

  const handleClick = () => {
    posthog?.capture('chart_csv_downloaded', {
      file_count: filesData.length,
      file_names: filesData.map(f => f.fileName),
    });
    downloadChartsToCsv(buildDataToDownload())();
  };

  return (
    <Button
      variant="contained"
      disableElevation
      onClick={handleClick}
      disabled={disabled}
      sx={{
        ...downloadButtonSx,
        marginLeft: '25%',
        marginRight: '25%',
        width: '50%',
      }}
    >
      {t('Download CSV')}
    </Button>
  );
}

export default DownloadChartCSVButton;
