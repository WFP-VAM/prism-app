import {Divider,
  Typography} from '@mui/material';
import { useSafeTranslation } from 'i18n';
import { makeStyles, createStyles } from '@mui/styles';
import { borderGray } from 'muiTheme';
import React from 'react';
import { useAACommonStyles } from '../utils';
import {
  getLegendPhases,
  getDescriptionText,
} from '../AnticipatoryActionDroughtPanel/utils/countryConfig';
import HowToReadModal from '../HowToReadModal';

function AADroughtLegend({ showDescription = true }: AADroughtLegendProps) {
  const [open, setOpen] = React.useState(false);
  const classes = useStyles();
  const commonClasses = useAACommonStyles();
  const { t } = useSafeTranslation();

  const phases = getLegendPhases();
  const descriptionText = getDescriptionText();

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
            {t(descriptionText)}
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
