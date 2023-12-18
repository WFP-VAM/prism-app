import { Box, WithStyles, createStyles, withStyles } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { PanelSize } from 'config/types';
import useLayersHook from 'hook/useLayersHook';
import FoldButton from '../FoldButton';
import ExtraFeature from '../ExtraFeature';
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
  isAlertFormOpen: boolean;
  isPanelHidden: boolean;
  setIsPanelHidden: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAlertFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  panelSize: PanelSize;
}

const OtherFeatures = ({
  classes,
  isAlertFormOpen,
  isPanelHidden,
  panelSize,
  setIsPanelHidden,
  setIsAlertFormOpen,
}: OtherFeaturesProps) => {
  const {
    numberOfActiveLayers,
    selectedLayers,
    adminBoundariesExtent,
    selectedLayerDates,
    selectedLayersWithDateSupport,
  } = useLayersHook();

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
          activeLayers={numberOfActiveLayers}
          isPanelHidden={isPanelHidden}
          setIsPanelHidden={setIsPanelHidden}
        />
        {isShowingExtraFeatures && (
          <ExtraFeature
            selectedLayers={selectedLayers}
            adminBoundariesExtent={adminBoundariesExtent}
            isAlertFormOpen={isAlertFormOpen}
            setIsAlertFormOpen={setIsAlertFormOpen}
          />
        )}
        {isShowingExtraFeatures && selectedLayerDates.length > 0 && (
          <DateSelector
            availableDates={selectedLayerDates}
            selectedLayers={selectedLayersWithDateSupport}
          />
        )}
        {showBoundaryInfo && <BoundaryInfoBox />}
      </Box>
    </Box>
  );
};

export default memo(withStyles(styles)(OtherFeatures));
