import { ReactNode } from 'react';
import { Box, Typography, makeStyles } from '@material-ui/core';

interface BlockPreviewHeaderProps {
  title: string;
  subtitle?: string;
  downloadActions?: ReactNode;
}

function BlockPreviewHeader({
  title, // Expects translated title
  subtitle, // Expects translated subtitle
  downloadActions,
}: BlockPreviewHeaderProps) {
  const classes = useStyles();

  return (
    <Box className={classes.previewHeader}>
      <Box className={classes.leftColumn}>
        <Typography variant="h3" className={classes.previewTitle}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" className={classes.previewSubtitle}>
            - {subtitle}
          </Typography>
        )}
      </Box>
      {downloadActions && (
        <Box className={classes.downloadActions}>{downloadActions}</Box>
      )}
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: '1 1 auto',
    minWidth: 0,
    gap: theme.spacing(1),
  },
  previewTitle: {
    fontWeight: 'bold',
    wordWrap: 'break-word',
    flex: '0 1 auto',
  },
  previewSubtitle: {
    fontSize: '0.875rem',
    wordWrap: 'break-word',
    flex: '0 1 auto',
  },
  downloadActions: {
    display: 'flex',
    alignItems: 'center',
    flex: '0 0 auto',
    flexShrink: 0,
  },
}));

export default BlockPreviewHeader;
