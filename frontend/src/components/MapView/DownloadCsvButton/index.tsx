import {
  Button,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React, { MutableRefObject, useCallback } from 'react';
import { TFunctionKeys, t } from 'i18next';
import { groupBy, mapKeys, snakeCase } from 'lodash';
import { castObjectsArrayToCsv } from 'utils/csv-utils';
import { buildCsvFileName, downloadToFile } from '../utils';

export const downloadCsv = (
  params: [MutableRefObject<{ [key: string]: any[] }>, string][],
  // filename1: string,
  // dataForSecondCsv: MutableRefObject<{ [key: string]: any[] }>,
  // filename2: string,
) => {
  return () => {
    params.forEach(filedata => {
      const [dataForCsv, filename] = filedata;

      const dateColumn = 'Date';
      const getKeyName = (key: string, chartName: string) =>
        key.endsWith('_avg')
          ? `${snakeCase(chartName)}_avg`
          : snakeCase(chartName);

      const columnsNamesPerChart = Object.entries(dataForCsv.current).map(
        ([key, value]) => {
          const first = value[0];
          const keys = Object.keys(first);
          const filtered = keys.filter(x => x !== dateColumn);
          const mapped = filtered.map(x => getKeyName(x, key));
          return Object.fromEntries(mapped.map(x => [x, x]));
        },
      );

      const columnsNames = columnsNamesPerChart.reduce(
        (prev, curr) => ({ ...prev, ...curr }),
        { [dateColumn]: dateColumn },
      );

      const merged = Object.entries(dataForCsv.current)
        .map(([key, value]) => {
          return value.map(x => {
            return mapKeys(x, (v, k) =>
              k === dateColumn ? dateColumn : getKeyName(k, key),
            );
          });
        })
        .flat();
      if (merged.length < 1) {
        return;
      }

      const grouped = groupBy(merged, dateColumn);
      // The blueprint of objects array data
      const initialObjectsArrayBlueprintData = Object.keys(columnsNames).reduce(
        (acc: { [key: string]: string }, key) => {
          // eslint-disable-next-line fp/no-mutation
          acc[key] = '';
          return acc;
        },
        {},
      );

      const objectsArray = Object.entries(grouped).map(([, value]) => {
        return value.reduce(
          (prev, curr) => ({ ...prev, ...curr }),
          initialObjectsArrayBlueprintData,
        );
      });

      downloadToFile(
        {
          content: castObjectsArrayToCsv(objectsArray, columnsNames, ','),
          isUrl: false,
        },
        filename,
        'text/csv',
      );
    });
  };
};

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
