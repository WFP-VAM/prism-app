import { createStyles, makeStyles, Typography } from '@material-ui/core';

import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import { useSafeTranslation } from 'i18n';
import {
  formatLandfallDate,
  formatLandfallEstimatedLeadtime,
  formatLandfallTimeRange,
  formatReportDate,
} from '../../utils';

function PopupContent({ landfallInfo, reportDate }: PopupContentProps) {
  const classes = useStyles();
  const { t } = useSafeTranslation();

  return (
    <div className={classes.itemsContainer}>
      <Typography
        variant="body1"
        className={`${classes.text} ${classes.title}`}
      >
        {t('Report date')}: {formatReportDate(reportDate)}
      </Typography>
      <div className={classes.itemContainer}>
        <Typography
          variant="body1"
          className={classes.text}
          style={{ maxWidth: 100 }}
        >
          {t('Landfall estimated time')}
        </Typography>
        <Typography
          variant="body1"
          className={`${classes.text} ${classes.textAlignRight}`}
        >
          {formatLandfallDate(landfallInfo.time)}
          <span className={classes.block}>
            {formatLandfallTimeRange(landfallInfo.time)}
          </span>
        </Typography>
      </div>
      <div className={classes.itemContainer}>
        <Typography
          variant="body1"
          className={classes.text}
          style={{ maxWidth: 150 }}
        >
          {t('Landfall estimated leadtime')}
        </Typography>
        <Typography
          variant="body1"
          className={`${classes.text} ${classes.textAlignRight}`}
        >
          {formatLandfallEstimatedLeadtime(landfallInfo.time, reportDate)}
        </Typography>
      </div>
      <div className={classes.itemContainer}>
        <Typography
          variant="body1"
          className={classes.text}
          style={{ maxWidth: 150 }}
        >
          {t('District impacted by landfall')}
        </Typography>
        <Typography
          variant="body1"
          className={`${classes.text} ${classes.textAlignRight}`}
        >
          {landfallInfo.district}
        </Typography>
      </div>
    </div>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    block: {
      display: 'block',
    },
    itemsContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    itemContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px',
      background: '#FFFFFF',
    },
    text: {
      fontSize: '14px',
      lineHeight: '18px',
      fontWeight: 400,
    },
    title: {
      fontWeight: 700,
      padding: '2px 0px 2px 8px',
    },
    textAlignRight: {
      textAlign: 'right',
    },
  }),
);

interface PopupContentProps {
  landfallInfo: LandfallInfo;
  reportDate: string;
}

export default PopupContent;
