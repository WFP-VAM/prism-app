import {Typography} from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { useSelector } from 'react-redux';
import { AADataSelector } from 'context/anticipatoryAction/AAStormStateSlice';
import { useSafeTranslation } from 'i18n';
import { AAStormColors } from '../utils';

function ReadyTrigger() {
  const { t } = useSafeTranslation();
  const classes = useActivationTriggerStyles();
  const parsedStormData = useSelector(AADataSelector);

  if (!parsedStormData.readiness) {
    return null;
  }

  return (
    <div className={classes.root}>
      <Typography className={classes.headerText}>
        {t('Readiness trigger')}
      </Typography>

      <div className={classes.Wrapper}>
        <div className={classes.headColumnWrapper}>
          <div className={classes.headColumn}>
            <Typography className={classes.headColumnText}>
              {t('Readiness')}
            </Typography>
          </div>
          <div className={classes.rowWrapper}>
            <Typography>
              {t(
                `A system with severe tropical storm-force winds (or stronger) is expected to impact any of the coastal provinces within the next five days, with a lead time of at least 72 hours.`,
              )}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}

const useActivationTriggerStyles = makeStyles(() =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
    },
    Wrapper: {
      width: '100%',
      background: AAStormColors.background,
    },
    headColumnWrapper: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '2.5rem',
      margin: '1.5rem 1.5rem',
    },
    headColumn: {
      width: '10rem',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headColumnText: {
      borderRadius: '4px 4px 0px 0px',
      textAlign: 'left',
      textTransform: 'uppercase',
      lineHeight: '2rem',
      width: '100%',
      paddingLeft: '0.5rem',
      background: '#63b2bd',
      color: 'black',
    },
    headerText: {
      fontWeight: 'bold',
      textTransform: 'uppercase',
      height: '2rem',
      display: 'flex',
      margin: '0.2rem 1.5rem',
    },
    rowWrapper: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: '0.125rem 0.5rem',
      paddingRight: 0,
      background: 'white',
    },
  }),
);

export default ReadyTrigger;
