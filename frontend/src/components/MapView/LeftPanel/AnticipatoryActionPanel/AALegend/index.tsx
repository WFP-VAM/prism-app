import { ListItem, Paper } from '@mui/material';
import { Panel } from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { lightGrey } from 'muiTheme';
import { useSelector } from 'react-redux';

import AADroughtLegend from '../AADroughtLegend';
import AAFloodLegend from '../AAFloodLegend';
import { aaLegendPaperSx } from '../aaPanelStyles';
import AAStormLegend from '../AAStormLegend';

export interface AALegendProps {
  forPrinting?: boolean;
  showDescription?: boolean;
}

function AALegend({
  forPrinting = false,
  showDescription = true,
}: AALegendProps) {
  const tabPanel = useSelector(leftPanelTabValueSelector);
  const isStormAA = tabPanel === Panel.AnticipatoryActionStorm;
  const isDroughtAA = tabPanel === Panel.AnticipatoryActionDrought;
  const isFloodAA = tabPanel === Panel.AnticipatoryActionFlood;

  return (
    <ListItem disableGutters dense>
      <Paper
        className="legend-card"
        sx={aaLegendPaperSx}
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

export default AALegend;
