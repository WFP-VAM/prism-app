import { ReactNode } from 'react';
import { Box, Typography, makeStyles } from '@material-ui/core';

interface BlockPreviewHeaderProps {
  title: string;
  subtitle?: string;
  downloadActions?: ReactNode;
}

function BlockPreviewHeader({
  title,
  subtitle,
  downloadActions,
}: BlockPreviewHeaderProps) {
  const classes = useStyles();

  return (
    <Box className={classes.previewHeader}>
      <Typography variant="h2" className={classes.previewTitle}>
        {title}
      </Typography>
      {downloadActions && (
        <Box className={classes.downloadActions}>{downloadActions}</Box>
      )}
      {subtitle && (
        <Typography variant="body1" className={classes.previewDate}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

const useStyles = makeStyles(theme => ({
  previewHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    rowGap: theme.spacing(0.5),
    columnGap: theme.spacing(0.5),
  },
  previewTitle: {
    flex: '0 1 auto',
    minWidth: 0,
  },
  downloadActions: {
    display: 'flex',
    alignItems: 'center',
    flex: '0 0 auto',
  },
  previewDate: {
    flex: '0 1 auto',
    fontSize: '0.875rem',
    marginLeft: 'auto',
  },
}));

export default BlockPreviewHeader;
