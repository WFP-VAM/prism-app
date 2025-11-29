import { memo } from 'react';
import { makeStyles, createStyles } from '@mui/styles';
import { DashboardMode } from 'config/types';
import { dashboardModeSelector } from 'context/dashboardStateSlice';
import { useSelector } from 'react-redux';
import LegendItemsList from '../MapView/Legends/LegendItemsList';
import type { ExportConfig } from './DashboardContent';

interface DashboardLegendsProps {
  exportConfig?: ExportConfig;
  legendVisible?: boolean; // from map state
  legendPosition?: 'left' | 'right'; // from map state
}

const DashboardLegends = memo(
  ({ exportConfig, legendVisible, legendPosition }: DashboardLegendsProps) => {
    const classes = useStyles();
    const mode = useSelector(dashboardModeSelector);

    // Priority: exportConfig takes precedence if present, otherwise use map state values
    const isVisible =
      exportConfig?.toggles?.legendVisibility ?? legendVisible ?? true;
    // Convert position: exportConfig uses 0=left/1=right, map state uses 'left'/'right'
    const exportPosition = exportConfig?.legendPosition;
    const position = exportPosition ?? (legendPosition === 'left' ? 0 : 1); // default right (1)
    const scale = exportConfig?.legendScale ?? 0; // default 100% (0 means no reduction)

    if (!isVisible) {
      return null;
    }

    return (
      <aside
        className={classes.container}
        style={{
          left: position % 2 === 0 ? '12px' : 'auto',
          right: position % 2 === 0 ? 'auto' : '12px',
          transform: `scale(${1 - scale})`,
          transformOrigin: position % 2 === 0 ? 'top left' : 'top right',
        }}
      >
        <LegendItemsList forPrinting={mode !== DashboardMode.EDIT} />
      </aside>
    );
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      position: 'absolute',
      top: '8px',
      maxHeight: 'calc(100% - 48px)',
      overflowY: 'auto',
    },
  }),
);

export default DashboardLegends;
