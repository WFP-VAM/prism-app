import { createStyles, makeStyles, Typography } from '@material-ui/core';

import { LandfallInfo } from 'context/anticipatoryAction/AAStormStateSlice/parsedStormDataTypes';
import {
  formatLandfallDate,
  formatLandfallEstimatedLeadtime,
  formatLandfallTimeRange,
  formatReportDate,
} from '../../utils';

function PopupContent({ landfallInfo, reportDate }: PopupContentProps) {
  const classes = useStyles();

  return (
    <div className={classes.itemsContainer}>
      <Typography
        variant="body1"
        className={`${classes.text} ${classes.title}`}
      >
        Report date: {formatReportDate(reportDate)}
      </Typography>
      <div className={classes.itemContainer}>
        <Typography variant="body1" className={classes.text}>
          landfall <span className={classes.block}>estimated time</span>
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
        <Typography variant="body1" className={classes.text}>
          landfall estimated
          <span className={classes.block}>leadtime</span>
        </Typography>
        <Typography
          variant="body1"
          className={`${classes.text} ${classes.textAlignRight}`}
        >
          {formatLandfallEstimatedLeadtime(landfallInfo.time, reportDate)}
        </Typography>
      </div>
      <div className={classes.itemContainer}>
        <Typography variant="body1" className={classes.text}>
          District impacted
          <span className={classes.block}>by landfall</span>
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
