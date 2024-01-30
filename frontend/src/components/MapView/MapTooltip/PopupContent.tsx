import {
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { ClassNameMap } from '@material-ui/styles';
import { PopupData, PopupMetaData } from 'context/tooltipStateSlice';
import { Position } from 'geojson';
import { useSafeTranslation } from 'i18n';
import { isEmpty, isEqual, sum } from 'lodash';
import React, { Fragment, memo } from 'react';
import { TFunction } from 'utils/data-utils';

const styles = () =>
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
  });

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
        <tr className={classes.phasePopulationTableRow}>
          {Object.keys(phasePopulations).map((phaseName: string) => (
            <th>{t(phaseName)}</th>
          ))}
        </tr>
        <tr className={classes.phasePopulationTableRow}>
          {Object.values(phasePopulations).map((populationInPhase: number) => (
            <th>{populationInPhase.toLocaleString()}</th>
          ))}
        </tr>
        <tr className={classes.phasePopulationTableRow}>
          {Object.values(phasePopulations).map((populationInPhase: number) => (
            <th>
              {Math.round((populationInPhase / phasePopulations.Total) * 100)}%
            </th>
          ))}
        </tr>
      </table>
    </div>
  );

  return phasePopulationTable;
};

interface PopupContentProps extends WithStyles<typeof styles> {
  popupData: PopupData & PopupMetaData;
  coordinates: Position | undefined;
}

const PopupContent = ({
  popupData,
  coordinates,
  classes,
}: PopupContentProps) => {
  const { t } = useSafeTranslation();

  const phasePopulationTable = generatePhasePopulationTable(
    popupData,
    t,
    classes,
  );
  // filter out popupData where key value contains "Population in phase "
  const popupDataWithoutPhasePopulations: PopupData = Object.entries(
    popupData,
  ).reduce((acc: any, cur: any) => {
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
          return (
            <Fragment key={key}>
              {/* Allow users to show data without a key/title */}
              {!key.includes('do_not_display') &&
                key !== 'Population in phase 1' && (
                  <Typography
                    display="inline"
                    variant="h4"
                    color="inherit"
                    className={classes.text}
                  >
                    {`${t(key)}: `}
                  </Typography>
                )}
              {key !== 'Population in phase 1' && (
                <Typography
                  display="inline"
                  variant="h4"
                  color="inherit"
                  className={classes.text}
                >
                  {`${value.data}`}
                </Typography>
              )}
              {/* Phase classification data */}
              <Typography variant="h4" color="inherit">
                {value.adminLevel && `${t('Admin Level')}: ${value.adminLevel}`}
              </Typography>
              {key === 'Population in phase 1' && phasePopulationTable}
            </Fragment>
          );
        })}
    </>
  );
};

export default memo(withStyles(styles)(PopupContent));
