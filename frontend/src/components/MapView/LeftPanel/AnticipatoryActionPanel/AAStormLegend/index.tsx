import {Typography,
  Divider} from '@mui/material';
import anticipatoryActionIcons from 'components/Common/AnticipatoryAction/icons';

import { makeStyles, createStyles } from '@mui/styles';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { TimeSeries } from 'prism-common/';
import { useSafeTranslation } from 'i18n';
import { useSelector } from 'react-redux';

const phases = [
  {
    developments: ['disturbance', 'tropical-disturbance', 'low'],
    icon: anticipatoryActionIcons.disturbance,
    label: 'Low pressure system',
    speed: '< 51 km/h',
  },
  {
    developments: ['tropical-depression'],
    icon: anticipatoryActionIcons.tropicalDepression,
    label: 'Tropical depression',
    speed: '51-62 km/h',
  },
  {
    developments: ['moderate-tropical-storm'],
    icon: anticipatoryActionIcons.moderateStorm,
    label: 'Moderate tropical storm',
    speed: '63-88 km/h',
  },
  {
    developments: ['severe-tropical-storm'],
    icon: anticipatoryActionIcons.severeTropicalStorm,
    label: 'Severe tropical storm',
    speed: '89-118 km/h',
  },
  {
    developments: ['tropical-cyclone'],
    icon: anticipatoryActionIcons.tropicalCyclone,
    label: 'Tropical cyclone',
    speed: '119-166 km/h',
  },
  {
    developments: ['intense-tropical-cyclone'],
    icon: anticipatoryActionIcons.intenseTropicalCyclone,
    label: 'Intense tropical cyclone',
    speed: '167-213 km/h',
  },
  {
    developments: ['very-intense-tropical-cyclone'],
    icon: anticipatoryActionIcons.veryIntenseTropicalCyclone,
    label: 'Very intense tropical cyclone',
    speed: '214 km/h and above',
  },
  {
    developments: ['post-tropical-depression'],
    icon: anticipatoryActionIcons.postTropicalDepression,
    label: 'Post tropical depression',
  },
  {
    developments: ['sub-tropical-depression'],
    icon: anticipatoryActionIcons.subTropicalDepression,
    label: 'Sub tropical depression',
  },
  {
    developments: ['extratropical-system'],
    icon: anticipatoryActionIcons.extraTropicalSystem,
    label: 'Extra tropical system',
  },
  {
    developments: ['dissipating'],
    icon: anticipatoryActionIcons.dissipating,
    label: 'Dissipating',
  },
];

function getUniqueReportDevelopments(timeSeries: TimeSeries | undefined) {
  if (!timeSeries) {
    return [];
  }
  const allReportDeveloments = timeSeries.features.map(feature =>
    feature.properties.development.split(' ').join('-').toLowerCase(),
  );
  return [...new Set(allReportDeveloments)];
}

/**
 * Filter phases to keep only the ones which are used in the report
 */
function getPhasesInReport(timeSeries: TimeSeries | undefined) {
  const uniqueReportDevelopments = getUniqueReportDevelopments(timeSeries);

  return phases.filter(phase =>
    phase.developments.some(development =>
      uniqueReportDevelopments.includes(development),
    ),
  );
}

function AAStormLegend() {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const stormData = useSelector(AADataSelector);
  const currentPhases = getPhasesInReport(stormData.timeSeries);

  const buffers = [
    {
      isVisible: !!stormData.uncertaintyCone,
      color: '#2ecc71',
      label: 'Uncertainty cone',
    },
    {
      isVisible: !!stormData.activeDistricts?.Moderate?.polygon,
      color: '#FF8934',
      label: '89 km/h impact zone',
    },
    {
      isVisible: !!stormData.activeDistricts?.Severe?.polygon,
      color: '#E63701',
      label: '119 km/h impact zone',
    },
  ];

  const tracks = [
    {
      isVisible: getUniqueReportDevelopments(stormData.timeSeries).includes(
        'inland',
      ),
      icon: anticipatoryActionIcons.inland,
      label: 'Overland',
    },
    {
      isVisible: true,
      type: 'line',
      color: '#000000',
      label: 'Past analyzed track',
    },
    {
      isVisible: true,
      type: 'dashed',
      color: '#FF0000',
      label: 'Forecast track',
    },
  ];

  return (
    <div className={classes.root}>
      <Typography variant="h3" className={classes.title}>
        {t('Phases')}
      </Typography>

      <div className={classes.section}>
        {currentPhases.map(phase => (
          <div key={phase.label} className={classes.itemWrapper}>
            <img src={phase.icon} alt={phase.label} className={classes.icon} />
            <div>
              <Typography>{t(phase.label)}</Typography>
              {phase.speed && (
                <Typography color="textSecondary">({phase.speed})</Typography>
              )}
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <div className={classes.section}>
        {buffers
          .filter(buffer => buffer.isVisible)
          .map(buffer => (
            <div key={buffer.label} className={classes.itemWrapper}>
              <div
                className={classes.colorBox}
                style={{ borderColor: buffer.color }}
              />
              <Typography>{t(buffer.label)}</Typography>
            </div>
          ))}
        <Typography variant="caption" color="textSecondary">
          {t('By Météo France La Réunion')}
        </Typography>
      </div>

      <Divider />

      <div className={classes.section}>
        {tracks
          .filter(track => track.isVisible)
          .map(track => (
            <div key={track.label} className={classes.itemWrapper}>
              {track.type ? (
                <div
                  className={classes.line}
                  style={{
                    borderTop:
                      track.type === 'dashed'
                        ? `2px dashed ${track.color}`
                        : `2px solid ${track.color}`,
                  }}
                />
              ) : (
                <img
                  src={track.icon}
                  alt={track.label}
                  className={classes.icon}
                />
              )}
              <Typography>{t(track.label)}</Typography>
            </div>
          ))}
      </div>

      <Divider />

      <div className={classes.section}>
        <Typography variant="h3" className={classes.title}>
          {t('Districts')}
        </Typography>
        <div className={classes.itemWrapper}>
          <div className={classes.districtBox} />
          <Typography>{t('District')}</Typography>
        </div>
        <div className={classes.itemWrapper}>
          <div
            className={classes.districtBox}
            style={{ border: '2px solid black' }}
          />
          <Typography>{t('Monitored district')}</Typography>
        </div>
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      padding: '0rem 0rem',
    },
    title: {
      fontWeight: 'bold',
      marginBottom: '1rem',
    },
    section: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      marginTop: '1rem',
      marginBottom: '1rem',
    },
    itemWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    icon: {
      width: '20px',
      height: '20px',
      objectFit: 'contain',
    },
    colorBox: {
      width: '20px',
      height: '20px',
      border: '3px solid',
      borderRadius: '3px',
    },
    line: {
      width: '20px',
      height: 0,
    },
    districtBox: {
      width: '30px',
      height: '20px',
      border: '1px solid #666',
      borderRadius: '2px',
    },
  }),
);

export default AAStormLegend;
