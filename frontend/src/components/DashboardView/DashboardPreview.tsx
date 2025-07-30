import { Box, makeStyles, Typography } from '@material-ui/core';

function DashboardPreview() {
  const classes = useStyles();

  return (
    <Box className={classes.container}>
      <Typography variant="h4" className={classes.title}>
        Dashboard Preview
      </Typography>
      <Typography variant="body1" className={classes.placeholder}>
        This is a placeholder for the dashboard preview content. The actual
        dashboard content will be rendered here in a later phase.
      </Typography>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    padding: 24,
    minHeight: '400px',
  },
  closeButton: {
    position: 'absolute',
    top: -16,
    right: 16,
    zIndex: 100,
  },
  title: {
    marginBottom: 16,
    fontWeight: 600,
  },
  placeholder: {
    color: '#666',
    lineHeight: 1.6,
  },
}));

export default DashboardPreview;
