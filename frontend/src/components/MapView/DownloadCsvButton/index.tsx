import {
  Button,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import React, { MutableRefObject } from 'react';
import { t } from 'i18next';
import { groupBy, mapKeys, snakeCase } from 'lodash';
import { castObjectsArrayToCsv } from 'utils/csv-utils';
import { downloadToFile } from '../utils';

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
      marginLeft: '25%',
      marginRight: '25%',
      width: '50%',
      '&.Mui-disabled': { opacity: 0.5 },
    },
  });

interface DownloadChartCSVButtonProps extends WithStyles<typeof styles> {
  firstCsvFileName: string;
  secondCsvFileName?: string;
  dataForCsv: React.MutableRefObject<{ [key: string]: any[] }>;
  dataForSecondCsv?: React.MutableRefObject<{ [key: string]: any[] }>;
  disabled?: boolean;
}

const DownloadChartCSVButton = ({
  firstCsvFileName,
  secondCsvFileName,
  disabled = false,
  dataForCsv,
  dataForSecondCsv,
  classes,
}: DownloadChartCSVButtonProps) => {
  const buildDataToDownload = () => {
    const result = [[dataForCsv, firstCsvFileName]];
    if (secondCsvFileName && dataForSecondCsv) {
      const test = result.concat([[dataForSecondCsv, secondCsvFileName]]);
      console.log('test', test);
      return result.concat([[dataForSecondCsv, secondCsvFileName]]);
    }
    return result;
  };

  return (
    <Button
      className={classes.downloadButton}
      onClick={downloadCsv(
        buildDataToDownload() as [
          MutableRefObject<{ [key: string]: any[] }>,
          string,
        ][],
      )}
      disabled={disabled}
    >
      <Typography variant="body2">{t('Download CSV')}</Typography>
    </Button>
  );
};

export default withStyles(styles)(DownloadChartCSVButton);
