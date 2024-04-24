import {
  Button,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React from 'react';
import { t } from 'i18next';
import { downloadChartsToCsv } from 'utils/csv-utils';
import { cyanBlue } from 'muiTheme';

const styles = () =>
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
  });

interface DownloadChartCSVButtonProps extends WithStyles<typeof styles> {
  filesData: {
    fileName: string;
    data: { [key: string]: any[] };
  }[];
  disabled?: boolean;
}

const DownloadChartCSVButton = ({
  filesData,
  disabled = false,
  classes,
}: DownloadChartCSVButtonProps) => {
  const buildDataToDownload: () => [
    { [key: string]: any[] },
    string,
  ][] = () => {
    return filesData.map(fileData => [fileData.data, fileData.fileName]);
  };

  return (
    <Button
      className={classes.downloadButton}
      onClick={downloadChartsToCsv(buildDataToDownload())}
      disabled={disabled}
    >
      <Typography variant="body2">{t('Download CSV')}</Typography>
    </Button>
  );
};

export default withStyles(styles)(DownloadChartCSVButton);
