import React, { Fragment, memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Popup } from 'react-mapbox-gl';
import {
  createStyles,
  withStyles,
  WithStyles,
  LinearProgress,
} from '@material-ui/core';
import { GeoJSON } from 'geojson';
import { isEqual } from 'lodash';
import { tooltipSelector } from '../../../context/tooltipStateSlice';
import { isEnglishLanguageSelected, useSafeTranslation } from '../../../i18n';
import { getRoundedData } from '../../../utils/data-utils';

const MapTooltip = memo(({ classes }: TooltipProps) => {
  const popup = useSelector(tooltipSelector);
  const { t, i18n } = useSafeTranslation();

  const popupShowing = useMemo(() => {
    return popup.showing;
  }, [popup.showing]);

  const popupCoordinates = useMemo(() => {
    return popup.coordinates;
  }, [popup.coordinates]);

  const popupLocationName = useMemo(() => {
    return popup.locationName;
  }, [popup.locationName]);

  const popupLocationLocalName = useMemo(() => {
    return popup.locationLocalName;
  }, [popup.locationLocalName]);

  const popupTitle = useMemo(() => {
    if (isEnglishLanguageSelected(i18n)) {
      return popupLocationName;
    }
    return popupLocationLocalName;
  }, [i18n, popupLocationLocalName, popupLocationName]);

  const popupData = useMemo(() => {
    return popup.data;
  }, [popup.data]);

  const popupWmsGetFeatureInfoLoading = useMemo(() => {
    return popup.wmsGetFeatureInfoLoading;
  }, [popup.wmsGetFeatureInfoLoading]);

  const getRenderedKeyValuePopupContent = useCallback(
    (
      key: string,
      value: {
        data: number | string;
        coordinates: GeoJSON.Position;
        adminLevel?: number;
      },
    ) => {
      if (key === 'Population Exposure') {
        // The value is of localeString format and there is no easy way to revert it back
        const valueToShow =
          typeof value.data === 'number'
            ? value.data
            : value.data.split(',').join('');
        return `${t(key)}: ${getRoundedData(Number(valueToShow), t, 0)}`;
      }
      return `${t(key)}: ${value.data}`;
    },
    [t],
  );

  const renderedPopupContent = useMemo(() => {
    return Object.entries(popupData)
      .filter(([, value]) => {
        return isEqual(value.coordinates, popupCoordinates);
      })
      .map(([key, value]) => {
        return (
          <Fragment key={key}>
            <h4 key={key}>{getRenderedKeyValuePopupContent(key, value)}</h4>
            <h4>
              {value.adminLevel && `${t('Admin Level')}: ${value.adminLevel}`}
            </h4>
          </Fragment>
        );
      });
  }, [getRenderedKeyValuePopupContent, popupCoordinates, popupData, t]);

  const renderedPopupLoader = useMemo(() => {
    if (!popupWmsGetFeatureInfoLoading) {
      return null;
    }
    return <LinearProgress />;
  }, [popupWmsGetFeatureInfoLoading]);

  return useMemo(() => {
    if (!popupShowing || !popupCoordinates) {
      return null;
    }
    return (
      <Popup
        anchor="bottom"
        coordinates={popupCoordinates as GeoJSON.Position}
        className={classes.popup}
      >
        <h4>{popupTitle}</h4>
        {renderedPopupContent}
        {renderedPopupLoader}
      </Popup>
    );
  }, [
    classes.popup,
    popupCoordinates,
    popupShowing,
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
