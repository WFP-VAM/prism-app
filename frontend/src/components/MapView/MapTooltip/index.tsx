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
            {/* Allow users to show data without a key/title */}
            {!key.includes('do_not_display') && (
              <Typography
                display="inline"
                variant="h4"
                color="inherit"
                className={classes.text}
              >
                {`${t(key)}: `}
              </Typography>
            )}
            <Typography
              display="inline"
              variant="h4"
              color="inherit"
              className={classes.text}
            >
              {`${value.data}`}
            </Typography>
            <Typography variant="h4" color="inherit" className={classes.text}>
              {value.adminLevel && `${t('Admin Level')}: ${value.adminLevel}`}
            </Typography>
          </Fragment>
        );
      });
  }, [classes.text, popup.coordinates, popup.data, t]);

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
