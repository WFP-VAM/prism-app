import { createStyles, makeStyles, Typography } from '@material-ui/core';
import { FeatureCollection, Point } from 'geojson';
import { Popup } from 'react-map-gl/maplibre';

function AAStormLandfallPopup({
  points,
  landfallInfo,
}: AAStormLandfallPopupProps) {
  const classes = useStyles();
  return (
    <>
      {points.features.map(point => {
        const lng = point.geometry.coordinates[0];
        const lat = point.geometry.coordinates[1];

        return (
          <Popup
            //   key={timePoint.id}
            longitude={lng}
            latitude={lat}
            anchor="top"
            offset={15}
            closeButton={false}
            onClose={() => null}
            closeOnClick
            className={classes.popup}
            maxWidth="280px"
          >
            <div className={classes.itemsContainer}>
              <Typography
                variant="body1"
                className={`${classes.text} ${classes.title}`}
              >
                Report date: 0.3-26-2024 6pm
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
          </Popup>
        );
      })}
    </>
  );
}

interface LandfallInfo {
  landfall_time: string[];
  landfall_impact_district: string;
  landfall_impact_intensity: string[];
}
interface AAStormLandfallPopupProps {
  points: FeatureCollection<Point>;
  landfallInfo: LandfallInfo;
}

const useStyles = makeStyles(() =>
  createStyles({
    popup: {
      width: '280px',

      '& > .maplibregl-popup-content': {
        background: '#F1F1F1',
        padding: '0px 2px 0px 2px',
      },
      '& > .maplibregl-popup-tip': {
        borderBottomColor: '#F1F1F1',
        borderLeftWidth: '8px',
        borderRightWidth: '8px',
      },
    },
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
export default AAStormLandfallPopup;
