import { Box } from '@mui/material';
import { makeStyles, createStyles } from '@mui/styles';
import { memo, useMemo } from 'react';
import useLayers from 'utils/layers-utils';
import DateSelector from '../DateSelector';
import BoundaryInfoBox from '../BoundaryInfoBox';

const useStyles = makeStyles(() =>
  createStyles({
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
        {selectedLayersWithDateSupport.length > 0 && <DateSelector />}
        {showBoundaryInfo && <BoundaryInfoBox />}
      </Box>
    </Box>
  );
});

export default OtherFeatures;
