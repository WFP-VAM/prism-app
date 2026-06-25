import { createStyles, ListItem, makeStyles, Paper } from '@material-ui/core';
import { Panel } from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { lightGrey } from 'muiTheme';
import { useSelector } from 'react-redux';

import AADroughtLegend from '../AADroughtLegend';
import AAFloodLegend from '../AAFloodLegend';
import AAStormLegend from '../AAStormLegend';

export interface AALegendProps {
  forPrinting?: boolean;
  showDescription?: boolean;
}

function AALegend({
  forPrinting = false,
  showDescription = true,
}: AALegendProps) {
  const classes = useStyles();

  const tabPanel = useSelector(leftPanelTabValueSelector);
  const isStormAA = tabPanel === Panel.AnticipatoryActionStorm;
  const isDroughtAA = tabPanel === Panel.AnticipatoryActionDrought;
  const isFloodAA = tabPanel === Panel.AnticipatoryActionFlood;

  const legendCard = (
    <Paper
      className={`${classes.paper} legend-card`}
      elevation={forPrinting ? 0 : undefined}
      style={
        forPrinting
          ? {
              border: `1px solid ${lightGrey}`,
            }
          : undefined
      }
    >
      {isDroughtAA && <AADroughtLegend showDescription={showDescription} />}
      {isStormAA && <AAStormLegend />}
      {isFloodAA && <AAFloodLegend />}
    </Paper>
  );

  if (forPrinting) {
    return <div>{legendCard}</div>;
  }

  return (
    <ListItem disableGutters dense>
      {legendCard}
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
  }),
);

export default AALegend;
