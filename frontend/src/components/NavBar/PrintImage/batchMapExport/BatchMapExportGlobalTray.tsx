import {
  Box,
  createStyles,
  makeStyles,
  Paper,
  Slide,
  Theme,
  Typography,
} from '@material-ui/core';
import { useSafeTranslation } from 'i18n';

import BatchMapExportJobRows from './BatchMapExportJobRows';
import { useBatchMapExportJobs } from './useBatchMapExportJobs';

type Props = {
  /** When true, same list is shown inside the print panel instead. */
  printDialogOpen: boolean;
};

function BatchMapExportGlobalTray({ printDialogOpen }: Props) {
  const classes = useStyles();
  const { t } = useSafeTranslation();
  const { jobs, dismissBatchMapExportJob } = useBatchMapExportJobs();

  const visible = jobs.length > 0 && !printDialogOpen;

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper
        className={classes.paper}
        elevation={6}
        component="section"
        aria-label={t('Batch map exports')}
      >
        <Typography variant="subtitle1" className={classes.title}>
          {t('Batch map exports')}
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block">
          {t(
            'Track batch export progress here. You can run several jobs at once.',
          )}
        </Typography>
        <Box className={classes.listWrap}>
          <BatchMapExportJobRows
            jobs={jobs}
            onDismiss={dismissBatchMapExportJob}
            variant="compact"
          />
        </Box>
      </Paper>
    </Slide>
  );
}

/** Tray stays narrow so compact job cards match “small card” layout vs full-width print panel. */
const TRAY_MAX_WIDTH_PX = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      position: 'fixed',
      left: 'auto',
      right: theme.spacing(2),
      bottom: theme.spacing(2),
      maxWidth: TRAY_MAX_WIDTH_PX,
      // Avoid `100vw` (includes scrollbar width) clipping fixed-position tray at viewport edge.
      width: `min(${TRAY_MAX_WIDTH_PX}px, calc(100% - ${theme.spacing(4)}px))`,
      margin: 0,
      zIndex: theme.zIndex.snackbar,
      padding: theme.spacing(2, 2, 2),
      borderRadius: theme.shape.borderRadius,
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
    },
    title: {
      fontWeight: 600,
      marginBottom: theme.spacing(0.5),
    },
    listWrap: {
      marginTop: theme.spacing(1),
      maxHeight: 'min(40vh, 320px)',
      overflowY: 'auto',
    },
  }),
);

export default BatchMapExportGlobalTray;
