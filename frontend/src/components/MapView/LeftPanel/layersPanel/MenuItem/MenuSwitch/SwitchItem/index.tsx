import { Box, IconButton, Tooltip } from '@mui/material';
import type { AppDispatch } from 'context/store';
import { makeStyles, createStyles } from '@mui/styles';
import OpacityIcon from '@mui/icons-material/Opacity';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'context/hooks';

import { LayerKey, LayerType } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { clearDataset } from 'context/datasetStateSlice';
import { useSafeTranslation } from 'i18n';
import { useMapState } from 'utils/useMapState';
import { refreshBoundaries } from 'utils/map-utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import { Extent } from 'components/MapView/Layers/raster-utils';
import {
  availableDatesSelector,
  layersLoadingDatesIdsSelector,
} from 'context/serverStateSlice';
import { checkLayerAvailableDatesAndContinueOrRemove } from 'components/MapView/utils';
import { LocalError } from 'utils/error-utils';
import { opacitySelector, setOpacity } from 'context/opacityStateSlice';
import { toggleRemoveLayer } from './utils';
import LayerDownloadOptions from './LayerDownloadOptions';
import ExposureAnalysisOption from './ExposureAnalysisOption';
import SwitchTitle from './SwitchItemTitle';
import SwitchAction from './SwitchAction';
import OpacitySlider from './OpacitySlider';

const SwitchItem = memo(
  ({
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
    const classes = useStyles();
    const { t } = useSafeTranslation();
    const mapState = useMapState();
    const selectedLayers = mapState.layers;
    const serverAvailableDates = useSelector(availableDatesSelector);
    const map = mapState.maplibreMap();
    // keep track of layers for which we are computing available dates
    // to avoid triggering duplicate actions
    const layersLoadingDates = useSelector(layersLoadingDatesIdsSelector);
    const [isOpacitySelected, setIsOpacitySelected] = useState(false);
    const dispatch: AppDispatch = useDispatch();

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
            mapState.actions.removeLayer,
            removeLayerFromUrl,
            mapState.actions.addLayer,
          );
          return;
        }
        try {
          checkLayerAvailableDatesAndContinueOrRemove(
            selectedLayer,
            serverAvailableDates,
            layersLoadingDates,
            removeLayerFromUrl,
            dispatch,
          );
        } catch (error) {
          console.error((error as LocalError).getErrorMessage());
          return;
        }
        if (mapState.isGlobalMap) {
          const updatedUrl = appendLayerToUrl(
            urlLayerKey,
            selectedLayers,
            selectedLayer,
          );
          updateHistory(urlLayerKey, updatedUrl);
        }
        mapState.actions.addLayer(selectedLayer);
        if (
          'boundary' in selectedLayer ||
          selectedLayer.type !== 'admin_level_data'
        ) {
          return;
        }
        refreshBoundaries(map, mapState.actions);
      },
      [
        appendLayerToUrl,
        dispatch,
        group,
        layer,
        map,
        mapState.actions,
        mapState.isGlobalMap,
        removeLayerFromUrl,
        selectedLayers,
        serverAvailableDates,
        layersLoadingDates,
        updateHistory,
      ],
    );

    return (
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '100%',
        }}
      >
        <Box
          key={layerId}
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
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

const useStyles = makeStyles(() =>
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
  }),
);

export interface SwitchItemProps {
  layer: LayerType;
  extent?: Extent;
  groupMenuFilter?: string;
  disabledMenuSelection?: boolean;
}

export default SwitchItem;
