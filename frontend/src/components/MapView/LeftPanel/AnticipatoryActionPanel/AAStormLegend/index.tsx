import {
  Typography,
  makeStyles,
  createStyles,
  Divider,
} from '@material-ui/core';
import anticipatoryActionIcons from 'components/Common/AnticipatoryAction/icons';
import { useSafeTranslation } from 'i18n';

const phases = [
  {
    icon: anticipatoryActionIcons.disturbance,
    label: 'Weak low pressure system',
    speed: '< 51 km/h',
  },
  {
    icon: anticipatoryActionIcons.tropicalDepression,
    label: 'Tropical depression',
    speed: '51-62 km/h',
  },
  {
    icon: anticipatoryActionIcons.moderateStorm,
    label: 'Moderate tropical storm',
    speed: '63-88 km/h',
  },
  {
    icon: anticipatoryActionIcons.severeTropicalStorm,
    label: 'Severe tropical storm',
    speed: '89-118 km/h',
  },
  {
    icon: anticipatoryActionIcons.tropicalCyclone,
    label: 'Tropical cyclone',
    speed: '119-166 km/h',
  },
  {
    icon: anticipatoryActionIcons.intenseTropicalCyclone,
    label: 'Intense tropical cyclone',
    speed: '167-213 km/h',
  },
  {
    icon: anticipatoryActionIcons.veryIntensiveCyclone,
    label: 'Very intense tropical cyclone',
    speed: '214 km/h and above',
  },
  {
    icon: anticipatoryActionIcons.postTropicalDepression,
    label: 'Post tropical depression',
  },
  {
    icon: anticipatoryActionIcons.subTropicalDepression,
    label: 'Sub tropical depression',
  },
  {
    icon: anticipatoryActionIcons.extraTropicalSystem,
    label: 'Extra tropical system',
  },
];

const buffers = [
  {
    color: '#2ecc71',
    label: 'Uncertainty cone',
  },
  {
    color: '#FF8934',
    label: '89 km/h impact zone',
  },
  {
    color: '#E63701',
    label: '118 km/h impact zone',
  },
];

const tracks = [
  {
    icon: anticipatoryActionIcons.inland,
    label: 'Overland',
  },
  {
    type: 'line',
    color: '#000000',
    label: 'Past analyzed track',
  },
  {
    type: 'dashed',
    color: '#FF0000',
    label: 'Forecast track (date/time: La Réunion local time)',
  },
];

function AAStormLegend() {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  return (
    <div className={classes.root}>
      <Typography variant="h3" className={classes.title}>
        {t('Phases')}
      </Typography>

      <div className={classes.section}>
        {phases.map(phase => (
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
        {buffers.map(buffer => (
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
        {tracks.map(track => (
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
          <Typography>{t('Pilot district')}</Typography>
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
