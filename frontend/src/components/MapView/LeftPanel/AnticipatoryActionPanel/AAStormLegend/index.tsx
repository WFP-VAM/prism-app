import { Box, Divider, Typography } from '@mui/material';
import anticipatoryActionIcons from 'components/Common/AnticipatoryAction/icons';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { TimeSeries } from 'prism-common/';
import { useSelector } from 'react-redux';

import { aaStormLegendSx } from '../aaPanelStyles';

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
    <Box sx={aaStormLegendSx.root}>
      <Typography variant="h3" sx={aaStormLegendSx.title}>
        {t('Phases')}
      </Typography>

      <Box sx={aaStormLegendSx.section}>
        {currentPhases.map(phase => (
          <Box key={phase.label} sx={aaStormLegendSx.itemWrapper}>
            <Box
              component="img"
              src={phase.icon}
              alt={phase.label}
              sx={aaStormLegendSx.icon}
            />
            <div>
              <Typography>{t(phase.label)}</Typography>
              {phase.speed && (
                <Typography color="textSecondary">({phase.speed})</Typography>
              )}
            </div>
          </Box>
        ))}
      </Box>

      <Divider />

      <Box sx={aaStormLegendSx.section}>
        {buffers
          .filter(buffer => buffer.isVisible)
          .map(buffer => (
            <Box key={buffer.label} sx={aaStormLegendSx.itemWrapper}>
              <Box
                sx={aaStormLegendSx.colorBox}
                style={{ borderColor: buffer.color }}
              />
              <Typography>{t(buffer.label)}</Typography>
            </Box>
          ))}
        <Typography variant="caption" color="textSecondary">
          {t('By Météo France La Réunion')}
        </Typography>
      </Box>

      <Divider />

      <Box sx={aaStormLegendSx.section}>
        {tracks
          .filter(track => track.isVisible)
          .map(track => (
            <Box key={track.label} sx={aaStormLegendSx.itemWrapper}>
              {track.type ? (
                <Box
                  sx={aaStormLegendSx.line}
                  style={{
                    borderTop:
                      track.type === 'dashed'
                        ? `2px dashed ${track.color}`
                        : `2px solid ${track.color}`,
                  }}
                />
              ) : (
                <Box
                  component="img"
                  src={track.icon}
                  alt={track.label}
                  sx={aaStormLegendSx.icon}
                />
              )}
              <Typography>{t(track.label)}</Typography>
            </Box>
          ))}
      </Box>

      <Divider />

      <Box sx={aaStormLegendSx.section}>
        <Typography variant="h3" sx={aaStormLegendSx.title}>
          {t('Districts')}
        </Typography>
        <Box sx={aaStormLegendSx.itemWrapper}>
          <Box sx={aaStormLegendSx.districtBox} />
          <Typography>{t('District')}</Typography>
        </Box>
        <Box sx={aaStormLegendSx.itemWrapper}>
          <Box
            sx={aaStormLegendSx.districtBox}
            style={{ border: '2px solid black' }}
          />
          <Typography>{t('Monitored district')}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default AAStormLegend;
