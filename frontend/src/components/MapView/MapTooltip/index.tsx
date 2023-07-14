import React, { Fragment, memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
  Typography,
} from '@material-ui/core';
import { isEmpty, isEqual, sum } from 'lodash';
import { PopupData, tooltipSelector } from 'context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';

const generatePhasePopulationTable = (popupData: PopupData) => {
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
        Ref. period: {popupData['Reference period start']?.data} to{' '}
        {popupData['Reference period end']?.data}
      </Typography>
      <table
        style={{
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          width: '100%',
          borderWidth: '1px;',
          borderColor: 'inherit',
          borderStyle: 'solid',
        }}
      >
        <tr style={{ border: '1px solid white' }}>
          {Object.keys(phasePopulations).map((phase: string) => (
            <th>{phase}</th>
          ))}
        </tr>
        <tr style={{ border: '1px solid white' }}>
          {Object.values(phasePopulations).map((phase: number) => (
            <th>{phase.toLocaleString()}</th>
          ))}
        </tr>
        <tr style={{ border: '1px solid white' }}>
          {Object.values(phasePopulations).map((phase: number) => (
            <th>{Math.round((phase / phasePopulations.Total) * 100)}%</th>
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

  const renderedPopupContent = useMemo(() => {
    const phasePopulationTable = generatePhasePopulationTable(popupData);
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
  }, [classes.text, popup.coordinates, popupData, t]);

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
  ]);
});

const styles = () =>
  createStyles({
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
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
