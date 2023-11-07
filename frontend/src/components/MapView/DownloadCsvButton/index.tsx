import {
  Button,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React, { useCallback } from 'react';
import { TFunctionKeys, t } from 'i18next';
import { buildCsvFileName, downloadCsv } from '../utils';

const styles = () =>
  createStyles({
    downloadButton: {
      backgroundColor: '#62B2BD',
      '&:hover': {
        backgroundColor: '#62B2BD',
      },
      marginTop: '2em',
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  });

interface DownloadChartCSVButtonProps extends WithStyles<typeof styles> {
  admin0Key: string;
  secondAdmin0Key: string;
  country: string;
  selectedLayerTitles: string[] | TFunctionKeys[];
  multiCountry: any;
  selectedAdmin1Area: string;
  secondSelectedAdmin1Area: string;
  selectedAdmin2Area: string;
  secondSelectedAdmin2Area: string;
  comparePeriods: boolean;
  compareLocations: boolean;
  dataForCsv: React.MutableRefObject<{ [key: string]: any[] }>;
  dataForSecondCsv: React.MutableRefObject<{ [key: string]: any[] }>;
  disabled?: boolean;
}

const DownloadChartCSVButton = ({
  admin0Key,
  secondAdmin0Key,
  country,
  selectedLayerTitles,
  multiCountry,
  selectedAdmin1Area,
  secondSelectedAdmin1Area,
  selectedAdmin2Area,
  secondSelectedAdmin2Area,
  comparePeriods,
  compareLocations,
  disabled = false,
  dataForCsv,
  dataForSecondCsv,
  classes,
}: DownloadChartCSVButtonProps) => {
  const generateCSVFilename = useCallback(
    () =>
      buildCsvFileName([
        multiCountry ? admin0Key : country,
        selectedAdmin1Area ?? '',
        selectedAdmin2Area ?? '',
        ...(selectedLayerTitles as string[]),
        comparePeriods ? 'first_period' : '',
      ]),
    [
      admin0Key,
      comparePeriods,
      country,
      multiCountry,
      selectedAdmin1Area,
      selectedAdmin2Area,
      selectedLayerTitles,
    ],
  );

  const generateSecondCSVFilename = useCallback(
    () =>
      buildCsvFileName([
        multiCountry ? secondAdmin0Key : country,
        compareLocations
          ? secondSelectedAdmin1Area ?? ''
          : selectedAdmin1Area ?? '',
        compareLocations
          ? secondSelectedAdmin2Area ?? ''
          : selectedAdmin2Area ?? '',
        ...(selectedLayerTitles as string[]),
        comparePeriods ? 'second_period' : '',
      ]),
    [
      country,
      compareLocations,
      multiCountry,
      secondSelectedAdmin1Area,
      selectedAdmin1Area,
      secondAdmin0Key,
      secondSelectedAdmin2Area,
      selectedAdmin2Area,
      selectedLayerTitles,
      comparePeriods,
    ],
  );

  return (
    <Button
      className={classes.downloadButton}
      onClick={downloadCsv([
        [dataForCsv, generateCSVFilename()],
        [dataForSecondCsv, generateSecondCSVFilename()],
      ])}
      disabled={disabled}
    >
      <Typography variant="body2">{t('Download CSV')}</Typography>
    </Button>
  );
};

export default withStyles(styles)(DownloadChartCSVButton);
