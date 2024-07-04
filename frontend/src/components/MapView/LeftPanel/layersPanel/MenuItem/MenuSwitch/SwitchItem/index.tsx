import {
  Box,
  createStyles,
  IconButton,
  Tooltip,
  WithStyles,
  withStyles,
} from '@material-ui/core';
import OpacityIcon from '@material-ui/icons/Opacity';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LayerKey, LayerType } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { clearDataset } from 'context/datasetStateSlice';
import { layersSelector, mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { refreshBoundaries } from 'utils/map-utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { availableDatesSelector } from 'context/serverStateSlice';
import { checkLayerAvailableDatesAndContinueOrRemove } from 'components/MapView/utils';
import { LocalError } from 'utils/error-utils';
import { opacitySelector, setOpacity } from 'context/opacityStateSlice';
import { addLayer } from 'context/mapStateSlice';
import { toggleRemoveLayer } from './utils';
import LayerDownloadOptions from './LayerDownloadOptions';
import ExposureAnalysisOption from './ExposureAnalysisOption';
import SwitchTitle from './SwitchItemTitle';
import SwitchAction from './SwitchAction';
import OpacitySlider from './OpacitySlider';

const SwitchItem = memo(
  ({
    classes,
    layer,
    extent,
    groupMenuFilter,
    disabledMenuSelection,
  }: SwitchItemProps) => {
    const {
      id: layerId,
      title: layerTitle,
      opacity: initialOpacity,
      type: layerType,
      group,
    } = layer;
    const { t } = useSafeTranslation();
    const selectedLayers = useSelector(layersSelector);
    const serverAvailableDates = useSelector(availableDatesSelector);
    const map = useSelector(mapSelector);
    const [isOpacitySelected, setIsOpacitySelected] = useState(false);
    const dispatch = useDispatch();
    const opacity = useSelector(opacitySelector(layerId));
    const hexDisplay = layer.type === 'point_data' && layer.hexDisplay;
    // Hack to use composite layer type for hexDisplay layers and switch
    // to using fill for opacity control
    const layerTypeOverride = hexDisplay ? 'composite' : layerType;
    const { updateHistory, appendLayerToUrl, removeLayerFromUrl } =
      useUrlHistory();

    useEffect(() => {
      setIsOpacitySelected(false);
    }, [dispatch, initialOpacity, layerId, layerType, map]);

    useEffect(() => {
      if (opacity !== undefined) {
        return;
      }
      dispatch(
        setOpacity({
          map,
          value: initialOpacity || 0,
          layerId,
          layerType: layerTypeOverride,
        }),
      );
    }, [dispatch, initialOpacity, layerId, layerTypeOverride, map, opacity]);

    const someLayerAreSelected = useMemo(
      () =>
        selectedLayers.some(
          ({ id: testId }) =>
            testId === layerId ||
            (group && group.layers.some(l => l.id === testId)),
        ),
      [group, layerId, selectedLayers],
    );

    const selectedActiveLayer = useMemo(
      () =>
        someLayerAreSelected
          ? selectedLayers.filter(
              sl =>
                (group?.activateAll &&
                  group?.layers.find(l => l.id === sl.id && l.main)) ||
                (!group?.activateAll &&
                  group?.layers.map(l => l.id).includes(sl.id)),
            )
          : [],
      [group, someLayerAreSelected, selectedLayers],
    );

    const initialActiveLayerId = useMemo(
      () =>
        selectedActiveLayer.length > 0 ? selectedActiveLayer[0].id : layer.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [layer.id],
    );

    const [activeLayerId, setActiveLayerId] = useState(
      initialActiveLayerId || (group?.layers?.find(l => l.main)?.id as string),
    );

    useEffect(() => {
      setActiveLayerId(
        initialActiveLayerId ||
          (group?.layers?.find(l => l.main)?.id as string),
      );
    }, [group, initialActiveLayerId]);

    const exposure = useMemo(
      () => (layer.type === 'wms' && layer.exposure) || undefined,
      [layer.exposure, layer.type],
    );

    const validatedTitle = useMemo(
      () => t(group?.groupTitle || layerTitle || ''),
      [group, layerTitle, t],
    );

    const toggleLayerValue = useCallback(
      (selectedLayerId: string, checked: boolean) => {
        // reset opacity selected
        setIsOpacitySelected(false);
        // clear previous table dataset loaded first
        // to close the dataseries and thus close chart
        dispatch(clearDataset());

        const selectedLayer = group
          ? LayerDefinitions[selectedLayerId as LayerKey]
          : layer;

        const urlLayerKey = getUrlKey(selectedLayer);

        if (!checked) {
          toggleRemoveLayer(
            selectedLayer,
            map,
            urlLayerKey,
            dispatch,
            removeLayerFromUrl,
          );
          return;
        }
        try {
          checkLayerAvailableDatesAndContinueOrRemove(
            layer,
            serverAvailableDates,
            removeLayerFromUrl,
            dispatch,
          );
        } catch (error) {
          console.error((error as LocalError).getErrorMessage());
          return;
        }
        const updatedUrl = appendLayerToUrl(
          urlLayerKey,
          selectedLayers,
          selectedLayer,
        );
        updateHistory(urlLayerKey, updatedUrl);
        dispatch(addLayer(layer));
        if (
          'boundary' in selectedLayer ||
          selectedLayer.type !== 'admin_level_data'
        ) {
          return;
        }
        refreshBoundaries(map, dispatch);
      },
      [
        appendLayerToUrl,
        dispatch,
        group,
        layer,
        map,
        removeLayerFromUrl,
        selectedLayers,
        serverAvailableDates,
        updateHistory,
      ],
    );

    return (
      <Box display="flex" flexDirection="column" maxWidth="100%">
        <Box key={layerId} display="flex" alignItems="center">
          <SwitchAction
            activeLayerId={activeLayerId}
            someLayerAreSelected={someLayerAreSelected}
            toggleLayerValue={toggleLayerValue}
            validatedTitle={validatedTitle}
          />
          <SwitchTitle
            layer={layer}
            activeLayerId={activeLayerId}
            someLayerAreSelected={someLayerAreSelected}
            toggleLayerValue={toggleLayerValue}
            setActiveLayerId={setActiveLayerId}
            validatedTitle={validatedTitle}
            groupMenuFilter={groupMenuFilter}
            disabledMenuSelection={disabledMenuSelection}
          />
          <Tooltip title={t('Opacity') as string}>
            <span style={{ marginLeft: 'auto' }}>
              <IconButton
                disabled={!someLayerAreSelected}
                classes={{
                  root: isOpacitySelected
                    ? classes.opacityRootSelected
                    : classes.opacityRoot,
                }}
                onClick={() =>
                  setIsOpacitySelected(opacitySelected => !opacitySelected)
                }
              >
                <OpacityIcon />
              </IconButton>
            </span>
          </Tooltip>
          <ExposureAnalysisOption
            exposure={exposure}
            extent={extent}
            layer={layer}
            selected={someLayerAreSelected}
          />
          <LayerDownloadOptions
            layerId={activeLayerId}
            extent={extent}
            selected={someLayerAreSelected}
          />
        </Box>
        {someLayerAreSelected && isOpacitySelected && (
          <OpacitySlider
            activeLayerId={activeLayerId}
            layerId={layerId}
            layerType={layerTypeOverride}
          />
        )}
      </Box>
    );
  },
);

const styles = () =>
  createStyles({
    switch: {
      marginRight: 2,
    },
    switchTrack: {
      backgroundColor: '#E0E0E0',
    },
    switchBase: {
      color: '#E0E0E0',
      '&.Mui-checked': {
        color: '#53888F',
      },
      '&.Mui-checked + .MuiSwitch-track': {
        backgroundColor: '#B1D6DB',
      },
    },
    opacityRoot: {
      marginLeft: 'auto',
    },
    opacityRootSelected: {
      backgroundColor: '#4CA1AD',
      color: '#F2F2F2',
      marginLeft: 'auto',
      '&:hover': {
        color: '#4CA1AD',
      },
    },
  });

export interface SwitchItemProps extends WithStyles<typeof styles> {
  layer: LayerType;
  extent?: Extent;
  groupMenuFilter?: string;
  disabledMenuSelection?: boolean;
}

export default withStyles(styles)(SwitchItem);
