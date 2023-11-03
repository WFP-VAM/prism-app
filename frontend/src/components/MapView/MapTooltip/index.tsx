import React, { Fragment, memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
  Typography,
  Link,
} from '@material-ui/core';
import { isEmpty, isEqual, sum } from 'lodash';
import { PopupData, tooltipSelector } from 'context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import { TFunction } from 'utils/data-utils';
import { ClassNameMap } from '@material-ui/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

// This function prepares phasePopulationTable for rendering and is specific
// to the data structure of the phase classification layer.
// Note - this is a bit hacky for now and will likely need to be revamped if we
// encounter other complex needs for tooltips.
const generatePhasePopulationTable = (
  popupData: PopupData,
  t: TFunction,
  classes: ClassNameMap,
): JSX.Element | null => {
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

const MapTooltip = memo(({ classes }: TooltipProps) => {
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();

  const popupData = popup.data;

  const popupTitle = useMemo(() => {
    if (isEnglishLanguageSelected(i18n)) {
      return popup.locationName;
    }
    return popup.locationLocalName;
  }, [i18n, popup.locationLocalName, popup.locationName]);

  const computeDisasterTypeFromDistTyp = (distTyp: string) => {
    if (!Number(distTyp)) {
      throw Error('distTyp must be convertable to integer');
    }
    if (distTyp === '1') {
      return 'FLOOD';
    }
    if (distTyp === '2') {
      return 'DROUGHT';
    }
    return 'INCIDENT';
  };

  const renderedRedirectToDMP = useMemo(() => {
    if (!popupData.dmpDisTyp) {
      return null;
    }
    return (
      <Link
        href={`https://dmp.ovio.org/form/${computeDisasterTypeFromDistTyp(
          popupData.dmpDisTyp,
        )}/${popupData.dmpSubmissionId}`}
        target="_blank"
      >
        <Typography className={classes.externalLinkContainer}>
          <u>Report details</u>
          <FontAwesomeIcon icon={faExternalLinkAlt} />
        </Typography>
      </Link>
    );
  }, [classes, popupData]);

  const renderedPopupContent = useMemo(() => {
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
    return Object.entries(popupDataWithoutPhasePopulations)
      .filter(([, value]) => {
        return isEqual(value.coordinates, popup.coordinates);
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
      });
  }, [classes, popup.coordinates, popupData, t]);

  const renderedPopupLoader = useMemo(() => {
    if (!popup.wmsGetFeatureInfoLoading) {
      return null;
    }
    return <LinearProgress />;
  }, [popup.wmsGetFeatureInfoLoading]);

  return useMemo(() => {
    if (!popup.showing || !popup.coordinates) {
      return null;
    }
    return (
      <Popup coordinates={popup.coordinates} className={classes.popup}>
        {renderedRedirectToDMP}
        <Typography variant="h4" color="inherit" className={classes.title}>
          {popupTitle}
        </Typography>
        {renderedPopupContent}
        {renderedPopupLoader}
      </Popup>
    );
  }, [
    classes.popup,
    classes.title,
    popup.coordinates,
    popup.showing,
    popupTitle,
    renderedPopupContent,
    renderedPopupLoader,
    renderedRedirectToDMP,
  ]);
});

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
    title: {
      fontWeight: 600,
      marginBottom: '8px',
    },
    text: {
      marginBottom: '4px',
    },
    popup: {
      '& div.mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '5px 5px 5px 5px',
        maxWidth: '30em',
        maxHeight: '20em',
        overflow: 'auto',
      },
      '& div.mapboxgl-popup-tip': {
        'border-top-color': 'black',
        'border-bottom-color': 'black',
      },
    },
    externalLinkContainer: {
      display: 'flex',
      gap: '8px',
      color: '#5b9bd5',
      fontWeight: 'bold',
      marginBottom: '8px',
      alignItems: 'center',
    },
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
