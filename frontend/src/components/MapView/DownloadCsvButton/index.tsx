import {
  Button,
  createStyles,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { usePostHog } from '@posthog/react';
import { t } from 'i18next';
import { cyanBlue } from 'muiTheme';
import { downloadChartsToCsv } from 'utils/csv-utils';

const useStyles = makeStyles(() =>
  createStyles({
    downloadButton: {
      backgroundColor: cyanBlue,
      '&:hover': {
        backgroundColor: cyanBlue,
      },
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  }),
);

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
  const classes = useStyles();
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
      className={classes.downloadButton}
      onClick={handleClick}
      disabled={disabled}
    >
      <Typography variant="body2">{t('Download CSV')}</Typography>
    </Button>
  );
}

export default DownloadChartCSVButton;
