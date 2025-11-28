import {Typography} from '@mui/material';
import { ClassNameMap, makeStyles, createStyles } from '@mui/styles';
import { PopupData, PopupMetaData } from 'context/tooltipStateSlice';
import { Position } from 'geojson';
import { useSafeTranslation } from 'i18n';
import { isEmpty, isEqual, sum } from 'lodash';
import React, { Fragment, memo } from 'react';
import { TFunction } from 'utils/data-utils';

const useStyles = makeStyles(() =>
  createStyles({
    phasePopulationTable: {
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      width: '100%',
      borderWidth: '1px;',
      borderColor: 'inherit',
      borderStyle: 'solid',
      border: '1px solid white',
    },
    phasePopulationTableRow: {
      border: '1px solid white',
    },
    text: {
      marginBottom: '4px',
    },
  }),
);

// This function prepares phasePopulationTable for rendering and is specific
// to the data structure of the phase classification layer.
// Note - this is a bit hacky for now and will likely need to be revamped if we
// encounter other complex needs for tooltips.
const generatePhasePopulationTable = (
  popupData: PopupData,
  t: TFunction,
  classes: ClassNameMap,
): React.JSX.Element | null => {
  const phasePopulations: Record<string, number> = Object.entries(
    popupData,
  ).reduce((acc: any, cur: any) => {
    const [key, value] = cur;
    if (key.includes('Population in phase ')) {
      // extract number from string looking like "Phase classification 1"
      const phaseNumber = key.replace('Population in phase ', '');
      if (phaseNumber) {
        return { ...acc, [phaseNumber]: value.data };
      }
    }
    return acc;
  }, {});

  if (isEmpty(phasePopulations)) {
    return null;
  }

  // calculate total population
  // eslint-disable-next-line no-param-reassign, fp/no-mutation
  phasePopulations.Total =
    sum(Object.values(phasePopulations)) - phasePopulations['3 to 5'];

  if (phasePopulations.Total === 0) {
    return null;
  }

  const phasePopulationTable = (
    <div>
      <Typography display="inline" variant="h4" color="inherit">
        {t('Ref. period')}: {popupData['Reference period start']?.data} -{' '}
        {popupData['Reference period end']?.data}
      </Typography>
      <Typography variant="h4" color="inherit">
        {t('Population and percentage by phase classification')}
      </Typography>
      <table className={classes.phasePopulationTable}>
        <tbody>
          <tr className={classes.phasePopulationTableRow}>
            {Object.keys(phasePopulations).map((phaseName: string) => (
              <th key={phaseName}>{t(phaseName)}</th>
            ))}
          </tr>
          <tr className={classes.phasePopulationTableRow}>
            {Object.values(phasePopulations).map(
              (populationInPhase: number) => (
                <th key={populationInPhase}>
                  {populationInPhase.toLocaleString()}
                </th>
              ),
            )}
          </tr>
          <tr className={classes.phasePopulationTableRow}>
            {Object.values(phasePopulations).map(
              (populationInPhase: number) => (
                <th key={`perc_${populationInPhase}`}>
                  {Math.round(
                    (populationInPhase / phasePopulations.Total) * 100,
                  )}
                  %
                </th>
              ),
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );

  return phasePopulationTable;
};

interface PopupContentProps {
  popupData: PopupData & PopupMetaData;
  coordinates: Position | undefined;
}

const PopupContent = memo(({ popupData, coordinates }: PopupContentProps) => {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  const phasePopulationTable = generatePhasePopulationTable(
    popupData,
    t,
    classes,
  );
  // If a table is displayed, filter out popupData where key value contains "Population in phase"
  const popupDataWithoutPhasePopulations: PopupData = !phasePopulationTable
    ? popupData
    : Object.entries(popupData).reduce((acc: any, cur: any) => {
        const [key, value] = cur;
        if (
          // keep "Population in phase 1" as a placeholder for the phase population table
          key === 'Population in phase 1' ||
          (!key.includes('Population in phase ') &&
            !key.includes('Reference period '))
        ) {
          return { ...acc, [key]: value };
        }
        return acc;
      }, {});

  return (
    <>
      {Object.entries(popupDataWithoutPhasePopulations)
        .filter(([, value]) => {
          // TODO - this seems like a hacky way to filter data and likely to break
          // Temporarily add logging to determine if this is actually filtering out any data
          // Note - introduced  by Harry in https://github.com/WFP-VAM/prism-app/pull/834/
          if (!isEqual(value.coordinates, coordinates)) {
            /* eslint-disable no-console */
            console.log(
              'Coordinates are not equal and some data should be omitted!',
            );
            console.log('Data Coordinates:', value.coordinates);
            console.log('Popup coordinates:', coordinates);
            /* eslint-enable no-console */
          }
          if (value.data === undefined) {
            return false;
          }
          // return isEqual(value.coordinates, coordinates);
          return true;
        })
        .map(([key, value]) => {
          // If the data is undefined, null, or an empty string, we do not render the data (only render the key)
          const isKeyValuePair = [undefined, null, ''].every(
            item => item !== value.data,
          );
          return (
            <Fragment key={key}>
              <div>
                {/* Allow users to show data without a key/title */}
                {!key.includes('do_not_display') &&
                  key !== 'Population in phase 1' && (
                    <Typography
                      display="inline"
                      variant="h4"
                      color="inherit"
                      className={classes.text}
                    >
                      {isKeyValuePair ? `${t(key)}: ` : t(key)}
                    </Typography>
                  )}
                {key !== 'Population in phase 1' && isKeyValuePair && (
                  <Typography
                    display="inline"
                    variant="h4"
                    color="inherit"
                    className={classes.text}
                  >
                    {`${value.data}`}
                  </Typography>
                )}
              </div>
              {/* Phase classification data */}
              {key === 'Population in phase 1' && phasePopulationTable}
            </Fragment>
          );
        })}
    </>
  );
});

export default PopupContent;
