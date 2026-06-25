import { Box, createStyles, makeStyles } from '@material-ui/core';
import { memo, useMemo } from 'react';
import useLayers from 'utils/layers-utils';

import BoundaryInfoBox from '../BoundaryInfoBox';
import DateSelector from '../DateSelector';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      right: 0,
      /* Full-viewport shell must not eat clicks meant for LeftPanel / map — restore hits only on children. */
      pointerEvents: 'none',
    },
    optionContainer: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      pointerEvents: 'none',
    },
  }),
);

const OtherFeatures = memo(() => {
  const { selectedLayersWithDateSupport } = useLayers();
  const classes = useStyles();

  const showBoundaryInfo = useMemo(
    () => JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false'),
    [],
  );

  return (
    <Box className={classes.container}>
      <Box className={classes.optionContainer}>
        {selectedLayersWithDateSupport.length > 0 && (
          <Box style={{ pointerEvents: 'auto' }}>
            <DateSelector />
          </Box>
        )}
        {showBoundaryInfo && (
          <Box style={{ pointerEvents: 'auto' }}>
            <BoundaryInfoBox />
          </Box>
        )}
      </Box>
    </Box>
  );
});

export default OtherFeatures;
