import {
  Button,
  createStyles,
  Grid,
  Hidden,
  Typography,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import { Visibility, VisibilityOff } from '@material-ui/icons';
import React, { useState, memo, useMemo, useCallback } from 'react';
import { LayerType } from 'config/types';
import { useSafeTranslation } from 'i18n';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { useDispatch, useSelector } from 'react-redux';
import {
  analysisResultOpacitySelector,
  analysisResultSelector,
  isAnalysisLayerActiveSelector,
  isExposureAnalysisLoadingSelector,
} from 'context/analysisResultStateSlice';
import {
  layersSelector,
  mapSelector,
  loadingLayerIdsSelector,
  dateRangeSelector,
  layersDataSelector,
} from 'context/mapStateSlice/selectors';
import { loadingLayerIdsSelector as tileLoadingLayerIdsSelector } from 'context/mapTileLoadingStateSlice';
import { useUrlHistory } from 'utils/url-utils';
import LegendList from './LegendList';

const Legends = memo(
  ({ classes, extent, layers, renderButtons }: LegendsProps) => {
    // State
    const [open, setOpen] = useState(true);
    const { removeLayerFromUrl } = useUrlHistory();

    const dispatch = useDispatch();

    const isAnalysisLayerActive = useSelector(isAnalysisLayerActiveSelector);
    const analysisResult = useSelector(analysisResultSelector);
    const analysisLayerOpacity = useSelector(analysisResultOpacitySelector);

    const tileLayerIds = useSelector(tileLoadingLayerIdsSelector);
    const vectorLayerIds = useSelector(loadingLayerIdsSelector);

    const map = useSelector(mapSelector);
    const selectedLayers = useSelector(layersSelector);

    const isAnalysisExposureLoading = useSelector(
      isExposureAnalysisLoadingSelector,
    );
    const { startDate: selectedDate } = useSelector(dateRangeSelector);
    const layersData = useSelector(layersDataSelector);

    const { t } = useSafeTranslation();

    const renderedVisibilityButton = useMemo(() => {
      if (open) {
        return <VisibilityOff fontSize="small" />;
      }
      return <Visibility fontSize="small" />;
    }, [open]);

    const toggleLegendVisibility = useCallback(() => {
      setOpen(!open);
    }, [open]);

    return (
      <Grid item className={classes.container}>
        <Button
          className={classes.triggerButton}
          variant="contained"
          color="primary"
          onClick={toggleLegendVisibility}
        >
          {renderedVisibilityButton}
          <Hidden smDown>
            <Typography className={classes.label} variant="body2">
              {t('Legend')}
            </Typography>
          </Hidden>
        </Button>
        {open && (
          <LegendList
            layers={layers}
            extent={extent}
            isAnalysisLayerActive={isAnalysisLayerActive}
            analysisResult={analysisResult}
            analysisLayerOpacity={analysisLayerOpacity}
            dispatch={dispatch}
            map={map}
            selectedLayers={selectedLayers}
            tileLayerIds={tileLayerIds}
            vectorLayerIds={vectorLayerIds}
            isAnalysisExposureLoading={isAnalysisExposureLoading}
            selectedDate={selectedDate}
            adminLevelLayersData={layersData}
            removeLayerFromUrl={removeLayerFromUrl}
            renderButtons={renderButtons}
          />
        )}
      </Grid>
    );
  },
);

const styles = () =>
  createStyles({
    container: {
      textAlign: 'right',
    },
    triggerButton: {
      height: '3em',
    },
    label: {
      marginLeft: '10px',
    },
  });

export interface LegendsProps extends WithStyles<typeof styles> {
  extent?: Extent;
  layers: LayerType[];
  renderButtons?: boolean;
}

export default withStyles(styles)(Legends);
