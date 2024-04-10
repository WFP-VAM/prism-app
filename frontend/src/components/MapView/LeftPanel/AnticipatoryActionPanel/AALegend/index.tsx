import {
  Divider,
  ListItem,
  Paper,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray, gray } from 'muiTheme';
import React from 'react';
import { getAAColor, getAAIcon, useAACommonStyles } from '../utils';

const phases = [
  { icon: getAAIcon('Severe', 'Set'), phase: 'Set', severity: 'Severe' },
  { icon: getAAIcon('Severe', 'Ready'), phase: 'Ready', severity: 'Severe' },
  { icon: getAAIcon('Severe', 'na'), phase: 'No Action', severity: 'Severe' },
  { icon: getAAIcon('Moderate', 'Set'), phase: 'Set', severity: 'Moderate' },
  {
    icon: getAAIcon('Moderate', 'Ready'),
    phase: 'Ready',
    severity: 'Moderate',
  },
  {
    icon: getAAIcon('Moderate', 'na'),
    phase: 'No Action',
    severity: 'Moderate',
  },
];

interface AALegendProps {
  forPrinting?: boolean;
  showDescription?: boolean;
}

function AALegend({
  forPrinting = false,
  showDescription = true,
}: AALegendProps) {
  const classes = useStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();

  return (
    <ListItem disableGutters dense>
      <Paper
        className={classes.paper}
        elevation={forPrinting ? 0 : undefined}
        style={
          forPrinting
            ? {
                border: `1px solid ${gray}`,
              }
            : undefined
        }
      >
        <Typography variant="h2">{t('Phases')}</Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {phases.map(x => (
            <div className={classes.itemWrapper}>
              {x.icon}
              <div>
                <Typography style={{ whiteSpace: 'nowrap' }} variant="h3">
                  {t(x.phase)}
                </Typography>
                <Typography style={{ whiteSpace: 'nowrap' }} variant="h3">
                  {t(x.severity)}
                </Typography>
              </div>
            </div>
          ))}
          <div className={classes.itemWrapper}>
            <div className={classes.phaseNy} />
            <div>
              <Typography variant="h3">
                {t('AA triggers not yet monitored')}
              </Typography>
            </div>
          </div>
        </div>
        {showDescription && (
          <>
            <Typography>
              The{' '}
              <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                “Ready, Set & Go!” system
              </span>{' '}
              uses seasonal forecasts with longer lead time for preparedness
              (Ready phase) and shorter lead times for activation and
              mobilization (Set & Go! phases).
            </Typography>
            <Divider />

            <Typography variant="h2">{t('Districts')}</Typography>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className={classes.itemWrapper}>
                <div
                  style={{
                    minWidth: '2.2rem',
                    border: `1px solid ${borderGray}`,
                    borderRadius: '2px',
                  }}
                />
                <Typography>{t('District')}</Typography>
              </div>
              <div className={classes.itemWrapper}>
                <div className={commonClasses.newTag}>{t('NEW')}</div>
                <Typography>{t('District in new phase this month')}</Typography>
              </div>
            </div>
          </>
        )}
      </Paper>
    </ListItem>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    paper: {
      padding: 8,
      width: 180,
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    },
    itemWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: '0.25rem',
    },
    phaseNy: {
      minWidth: '2.2rem',
      background: getAAColor('ny', 'ny', true),
    },
  }),
);

export default AALegend;
