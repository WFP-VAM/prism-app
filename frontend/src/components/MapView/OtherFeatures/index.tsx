import { Box, WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { PanelSize } from 'config/types';
import useLayers from 'utils/layers-utils';
import FoldButton from '../FoldButton';
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

interface OtherFeaturesProps extends WithStyles<typeof styles> {
  isPanelHidden: boolean;
  setIsPanelHidden: React.Dispatch<React.SetStateAction<boolean>>;
  panelSize: PanelSize;
}

const OtherFeatures = ({
  classes,
  isPanelHidden,
  panelSize,
  setIsPanelHidden,
}: OtherFeaturesProps) => {
  const { selectedLayerDates } = useLayers();

  const showBoundaryInfo = useMemo(() => {
    return JSON.parse(process.env.REACT_APP_SHOW_MAP_INFO || 'false');
  }, []);

  const isShowingExtraFeatures = useMemo(() => {
    return panelSize !== PanelSize.xlarge || isPanelHidden;
  }, [isPanelHidden, panelSize]);

  return (
    <Box className={classes.container}>
      <Box
        className={classes.optionContainer}
        style={{ marginLeft: isPanelHidden ? PanelSize.folded : panelSize }}
      >
        <FoldButton
          isPanelHidden={isPanelHidden}
          setIsPanelHidden={setIsPanelHidden}
        />
        {isShowingExtraFeatures && selectedLayerDates.length > 0 && (
          <DateSelector />
        )}
        {showBoundaryInfo && <BoundaryInfoBox />}
      </Box>
    </Box>
  );
};

export default memo(withStyles(styles)(OtherFeatures));
