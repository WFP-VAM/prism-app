import {
  Divider,
  Typography,
  createStyles,
  makeStyles,
} from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { borderGray } from 'muiTheme';
import React from 'react';
import { safeCountry } from 'config';
import { getAAIcon } from '../AnticipatoryActionDroughtPanel/utils';
import { useAACommonStyles } from '../utils';
import HowToReadModal from '../HowToReadModal';

const isZimbabwe = safeCountry === 'zimbabwe';

const phases = [
  ...(isZimbabwe
    ? []
    : [
        {
          icon: getAAIcon('Severe', 'Set', true),
          phase: 'Set',
          severity: 'Severe',
        },
        {
          icon: getAAIcon('Severe', 'Ready', true),
          phase: 'Ready',
          severity: 'Severe',
        },
      ]),
  {
    icon: getAAIcon('Moderate', 'Set', true),
    phase: 'Set',
    severity: 'Moderate',
  },
  {
    icon: getAAIcon('Moderate', 'Ready', true),
    phase: 'Ready',
    severity: 'Moderate',
  },
  ...(isZimbabwe
    ? [
        {
          icon: getAAIcon('Normal', 'Set', true),
          phase: 'Set',
          severity: 'Below Normal',
        },
        {
          icon: getAAIcon('Normal', 'Ready', true),
          phase: 'Ready',
          severity: 'Below Normal',
        },
      ]
    : [
        {
          icon: getAAIcon('Mild', 'Set', true),
          phase: 'Set',
          severity: 'Mild',
        },
        {
          icon: getAAIcon('Mild', 'Ready', true),
          phase: 'Ready',
          severity: 'Mild',
        },
      ]),
  {
    icon: getAAIcon('na', 'na', true),
    phase: 'No Action',
  },
  {
    icon: getAAIcon('ny', 'ny', true),
    phase: 'Not Yet Monitored',
  },
];

function AADroughtLegend({ showDescription = true }: AADroughtLegendProps) {
  const [open, setOpen] = React.useState(false);
  const classes = useStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();

  return (
    <>
      <HowToReadModal open={open} onClose={() => setOpen(false)} />

      <Typography variant="h3" style={{ fontWeight: 'bold' }}>
        {t('Phases')}
      </Typography>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {phases.map(x => (
          <div key={`${x.phase}_${x.severity}`} className={classes.itemWrapper}>
            {x.icon}
            <div>
              <Typography style={{ whiteSpace: 'nowrap' }}>
                {t(x.phase)}
              </Typography>
              {x.severity && (
                <Typography style={{ whiteSpace: 'nowrap' }}>
                  {t(x.severity)}
                </Typography>
              )}
            </div>
          </div>
        ))}
      </div>
      {showDescription && (
        <>
          <Typography>
            {
              // TODO: handle onKeyDown
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <span
                className={classes.dialogButton}
                onClick={() => setOpen(true)}
                // onKeyDown={e => console.log(e)}
                role="button"
                tabIndex={0}
              >
                {t('The "Ready, Set & Go!" system')}
              </span>
            }{' '}
            {t(
              'uses seasonal forecasts with longer lead time for preparedness (Ready phase) and shorter lead times for activation and mobilization (Set & Go! phases).',
            )}
          </Typography>
          <Divider />

          <Typography variant="h3" style={{ fontWeight: 'bold' }}>
            {t('Districts')}
          </Typography>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
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
    </>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    itemWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: '0.5rem',
    },
    dialogButton: {
      fontWeight: 'bold',
      textDecoration: 'underline',
      cursor: 'pointer',
    },
  }),
);

interface AADroughtLegendProps {
  showDescription?: boolean;
}
export default AADroughtLegend;
