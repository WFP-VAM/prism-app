import { createStyles, makeStyles, Typography } from '@material-ui/core';

function PopupContent({ landfallInfo, reportDate }: PopupContentProps) {
  const classes = useStyles();

  return (
    <div className={classes.itemsContainer}>
      <Typography
        variant="body1"
        className={`${classes.text} ${classes.title}`}
      >
        Report date: {reportDate}
      </Typography>
      <div className={classes.itemContainer}>
        <Typography variant="body1" className={classes.text}>
          landfall <span className={classes.block}>estimated time</span>
        </Typography>
        <Typography
          variant="body1"
          className={`${classes.text} ${classes.textAlignRight}`}
        >
          12-03-2025
          <span className={classes.block}>06:00 - 12:00</span>
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
          8 - 12 hrs
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
          {landfallInfo.landfall_impact_district}
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

export interface LandfallInfo {
  landfall_time: string[];
  landfall_impact_district: string;
  landfall_impact_intensity: string[];
}

interface PopupContentProps {
  landfallInfo: LandfallInfo;
  reportDate: string;
}

export default PopupContent;
