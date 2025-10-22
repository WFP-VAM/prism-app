import { createStyles, makeStyles } from '@material-ui/core';
import { memo } from 'react';
import LegendItemsList from '../MapView/Legends/LegendItemsList';
import type { ExportConfig } from './DashboardContent';

interface DashboardLegendsProps {
  exportConfig?: ExportConfig;
}

const DashboardLegends = memo(({ exportConfig }: DashboardLegendsProps) => {
  const classes = useStyles();

  // Use export config if available, otherwise show normally
  const isVisible = exportConfig?.toggles?.legendVisibility ?? true;
  const position = exportConfig?.legendPosition ?? 1; // default right (1)
  const scale = exportConfig?.legendScale ?? 0; // default 100% (0 means no reduction)

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={classes.container}
      style={{
        left: position % 2 === 0 ? '8px' : 'auto',
        right: position % 2 === 0 ? 'auto' : '24px',
        transform: `scale(${1 - scale})`,
        transformOrigin: position % 2 === 0 ? 'top left' : 'top right',
      }}
    >
      <LegendItemsList forPrinting />
    </aside>
  );
});

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
