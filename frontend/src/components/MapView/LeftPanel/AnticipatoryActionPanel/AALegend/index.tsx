import {ListItem, Paper} from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { lightGrey } from 'muiTheme';
import { useSelector } from 'react-redux';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { Panel } from 'config/types';
import AADroughtLegend from '../AADroughtLegend';
import AAStormLegend from '../AAStormLegend';
import AAFloodLegend from '../AAFloodLegend';

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

  return (
    <ListItem disableGutters dense>
      <Paper
        className={classes.paper}
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
