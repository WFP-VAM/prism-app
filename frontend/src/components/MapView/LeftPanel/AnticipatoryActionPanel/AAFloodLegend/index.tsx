import {
  Typography,
  makeStyles,
  createStyles,
  Divider,
  Box,
  Slider,
} from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { black } from 'muiTheme';
import { Visibility } from '@material-ui/icons';
import { useSafeTranslation } from 'i18n';
import { getFloodRiskColor } from 'context/anticipatoryAction/AAFloodStateSlice/utils';
import { opacitySelector, setOpacity } from 'context/opacityStateSlice';
import { useMapState } from 'utils/useMapState';
import { useEffect } from 'react';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      padding: '0.5rem',
      minWidth: '350px',
      maxWidth: '400px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1rem',
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: 'bold',
      fontSize: '1.1rem',
    },
    closeButton: {
      padding: '4px',
    },
    sectionTitle: {
      fontWeight: 'bold',
      marginBottom: '0.75rem',
      fontSize: '0.95rem',
    },
    itemWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.5rem',
    },
    categoryCircle: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      flexShrink: 0,
    },
    trendTriangle: {
      width: 0,
      height: 0,
      flexShrink: 0,
    },
    itemText: {
      fontSize: '0.9rem',
    },
    divider: {
      margin: '0.75rem 0',
    },
    description: {
      fontSize: '0.85rem',
      color: '#666',
      lineHeight: 1.4,
    },
    link: {
      textDecoration: 'underline',
      color: '#1976d2',
      cursor: 'pointer',
    },
    opacitySection: {
      marginBottom: '1rem',
    },
    sliderContainer: {
      paddingLeft: '0.5rem',
      paddingRight: '0.5rem',
    },
  }),
);

function AAFloodLegend() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const { maplibreMap } = useMapState();
  const map = maplibreMap();
  const layerId = 'anticipatory_action_flood';
  const opacity = useSelector(opacitySelector(layerId));

  useEffect(() => {
    if (opacity !== undefined) {
      return;
    }
    dispatch(
      setOpacity({
        map,
        value: 1, // Default to full opacity
        layerId,
        layerType: 'wms',
      }),
    );
  }, [dispatch, layerId, map, opacity]);

  const categories = [
    {
      color: getFloodRiskColor('Severe'),
      label: 'Severe',
    },
    {
      color: getFloodRiskColor('Moderate'),
      label: 'Moderate',
    },
    {
      color: getFloodRiskColor('Bankfull'),
      label: 'Bankfull',
    },
    {
      color: getFloodRiskColor('Below bankfull'),
      label: 'Not exceeded',
    },
    {
      color: '#9E9E9E', // Gray for no data
      label: 'No data',
    },
  ];

  const handleGoogleResearchClick = () => {
    window.open('https://research.google/', '_blank');
  };

  const handleOpacityChange = (event: any, newValue: number | number[]) => {
    dispatch(
      setOpacity({
        map,
        value: newValue as number,
        layerId,
        layerType: 'wms',
      }),
    );
  };

  return (
    <div>
      <Box className={classes.header}>
        <Box className={classes.title}>
          <Visibility style={{ color: black }} />
          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Legend')}
          </Typography>
        </Box>
      </Box>

      <Typography className={classes.sectionTitle}>
        {t('River discharge forecast')}
      </Typography>

      {categories.map(category => (
        <div key={category.label} className={classes.itemWrapper}>
          <div
            className={classes.categoryCircle}
            style={{ backgroundColor: category.color }}
          />
          <Typography className={classes.itemText}>
            {t(category.label)}
          </Typography>
        </div>
      ))}

      <Divider className={classes.divider} />

      <Typography className={classes.description}>
        {t('River discharge forecast at verified gauges. Visit')}{' '}
        <span
          className={classes.link}
          onClick={handleGoogleResearchClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleGoogleResearchClick();
            }
          }}
        >
          {t('Google Research')}
        </span>{' '}
        {t('to learn more about their AI forecasting models.')}
      </Typography>

      <Divider className={classes.divider} />

      <Box className={classes.opacitySection}>
        <Typography className={classes.sectionTitle}>{t('Opacity')}</Typography>
        <Box className={classes.sliderContainer}>
          <Slider
            value={opacity || 1}
            onChange={handleOpacityChange}
            min={0}
            max={1}
            step={0.01}
            valueLabelDisplay="auto"
            valueLabelFormat={value => `${Math.round(value * 100)}%`}
          />
        </Box>
      </Box>
    </div>
  );
}

export default AAFloodLegend;
