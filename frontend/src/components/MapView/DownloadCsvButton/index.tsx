import {
  Button,
  createStyles,
  makeStyles,
  Typography,
} from '@material-ui/core';
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
  const buildDataToDownload: () => [{ [key: string]: any[] }, string][] = () =>
    filesData.map(fileData => [fileData.data, fileData.fileName]);

  return (
    <Button
      className={classes.downloadButton}
      onClick={downloadChartsToCsv(buildDataToDownload())}
      disabled={disabled}
    >
      <Typography variant="body2">{t('Download CSV')}</Typography>
    </Button>
  );
}

export default DownloadChartCSVButton;
