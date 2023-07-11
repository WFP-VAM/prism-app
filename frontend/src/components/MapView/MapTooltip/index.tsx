import React, { Fragment, memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
} from '@material-ui/core';
import { isEqual } from 'lodash';
import { tooltipSelector } from 'context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';

const MapTooltip = memo(({ classes }: TooltipProps) => {
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();

  const popupTitle = useMemo(() => {
    if (isEnglishLanguageSelected(i18n)) {
      return popup.locationName;
    }
    return popup.locationLocalName;
  }, [i18n, popup.locationLocalName, popup.locationName]);

  const renderedPopupContent = useMemo(() => {
    return Object.entries(popup.data)
      .filter(([, value]) => {
        return isEqual(value.coordinates, popup.coordinates);
      })
      .map(([key, value]) => {
        return (
          <Fragment key={key}>
            <h4 key={key}>{`${t(key)}: ${value.data}`}</h4>
            <h4>
              {value.adminLevel && `${t('Admin Level')}: ${value.adminLevel}`}
            </h4>
          </Fragment>
        );
      });
  }, [popup.coordinates, popup.data, t]);

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
      <Popup
        anchor="bottom"
        coordinates={popup.coordinates}
        className={classes.popup}
      >
        <h4>{popupTitle}</h4>
        {renderedPopupContent}
        {renderedPopupLoader}
      </Popup>
    );
  }, [
    classes.popup,
    popup.coordinates,
    popup.showing,
    popupTitle,
    renderedPopupContent,
    renderedPopupLoader,
  ]);
});

const styles = () =>
  createStyles({
    popup: {
      '& div.mapboxgl-popup-content': {
        background: 'black',
        color: 'white',
        padding: '10px 10px 10px',
        maxWidth: '30em',
        maxHeight: '12em',
        overflow: 'auto',
      },
      '& div.mapboxgl-popup-tip': {
        'border-top-color': 'black',
      },
    },
  });

export interface TooltipProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(MapTooltip);
