import { Box, WithStyles, createStyles, withStyles } from '@material-ui/core';
import { memo, useMemo } from 'react';
import useLayers from 'utils/layers-utils';
import DateSelector from '../DateSelector';
import BoundaryInfoBox from '../BoundaryInfoBox';

const styles = createStyles({
  container: {
    height: '100%',
    width: '100%',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  optionContainer: {
    position: 'relative',
    height: '100%',
    display: 'flex',
  },
});

interface OtherFeaturesProps extends WithStyles<typeof styles> {}

const OtherFeatures = ({ classes }: OtherFeaturesProps) => {
  const { selectedLayerDates } = useLayers();

  const showBoundaryInfo = useMemo(() => {
    return JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false');
  }, []);

  return (
    <Box className={classes.container}>
      <Box className={classes.optionContainer}>
        {selectedLayerDates.length > 0 && <DateSelector />}
        {showBoundaryInfo && <BoundaryInfoBox />}
      </Box>
    </Box>
  );
};

export default memo(withStyles(styles)(OtherFeatures));
