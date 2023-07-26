import React, {
  memo,
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  Box,
  createStyles,
  Divider,
  Grid,
  IconButton,
  ListItem,
  Paper,
  Popover,
  Slider,
  Tooltip,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { Close, Opacity } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { LayerType, LegendDefinitionItem } from 'config/types';
import { mapSelector, layersSelector } from 'context/mapStateSlice/selectors';
import { clearDataset } from 'context/datasetStateSlice';
import { useSafeTranslation } from 'i18n';
import {
  clearAnalysisResult,
  setAnalysisLayerOpacity,
} from 'context/analysisResultStateSlice';
import LayerContentPreview from 'components/MapView/Legends/layerContentPreview';
import { handleChangeOpacity } from 'components/MapView/Legends/handleChangeOpacity';
import ColorIndicator from 'components/MapView/Legends/ColorIndicator';
import { getLegendItemLabel } from 'components/MapView/utils';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import LayerDownloadOptions from 'components/MapView/LeftPanel/layersPanel/MenuSwitch/SwitchItem/LayerDownloadOptions';
import AnalysisDownloadButton from 'components/MapView/Legends//AnalysisDownloadButton';
import { toggleRemoveLayer } from 'components/MapView/LeftPanel/layersPanel/MenuSwitch/SwitchItem/utils';
import LoadingBar from '../LoadingBar';

// Children here is legendText
const LegendItem = memo(
  ({
    classes,
    id,
    title,
    legend,
    type,
    opacity: initialOpacity,
    children,
    legendUrl,
    isAnalysis,
    fillPattern,
    extent,
  }: LegendItemProps) => {
    const dispatch = useDispatch();
    const { removeLayerFromUrl } = useUrlHistory();
    const map = useSelector(mapSelector);
    const [opacityEl, setOpacityEl] = useState<HTMLButtonElement | null>(null);
    const [opacity, setOpacityValue] = useState<number | number[]>(
      initialOpacity || 0,
    );

    useEffect(() => {
      setOpacityValue(initialOpacity || 0);
    }, [initialOpacity]);

    const { t } = useSafeTranslation();

    const openOpacity = (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpacityEl(event.currentTarget);
    };

    const closeOpacity = () => {
      setOpacityEl(null);
    };

    const open = Boolean(opacityEl);
    const opacityId = open ? 'opacity-popover' : undefined;

    const handleChangeOpacityValue = useCallback(
      val => {
        setOpacityValue(val);
        if (isAnalysis) {
          dispatch(setAnalysisLayerOpacity(val));
        }
      },
      [dispatch, isAnalysis],
    );

    const selectedLayers = useSelector(layersSelector);
    const layer = useMemo(() => {
      return selectedLayers.find(l => l.id === id);
    }, [id, selectedLayers]);

    const renderedOpacitySlider = useMemo(() => {
      return (
        <Box px={2} display="flex" className={classes.opacityBox}>
          <Typography classes={{ root: classes.opacityText }}>
            {`${Math.round((opacity as number) * 100)}%`}
          </Typography>
          <Slider
            value={opacity}
            step={0.01}
            min={0}
            max={1}
            aria-labelledby="opacity-slider"
            classes={{
              root: classes.opacitySliderRoot,
              thumb: classes.opacitySliderThumb,
            }}
            onChange={(e, newValue) =>
              handleChangeOpacity(
                e,
                newValue as number,
                map,
                id,
                type,
                handleChangeOpacityValue,
              )
            }
          />
        </Box>
      );
    }, [classes, handleChangeOpacityValue, id, map, opacity, type]);

    const layerDownloadOptions = useMemo(() => {
      return layer ? (
        <LayerDownloadOptions
          layer={layer}
          extent={extent}
          selected
          size="small"
        />
      ) : null;
    }, [layer, extent]);

    const remove = useCallback(() => {
      if (isAnalysis) {
        dispatch(clearAnalysisResult());
      }
      if (layer) {
        // reset opacity value
        setOpacityValue(initialOpacity || 0);
        // clear previous table dataset loaded first
        // to close the dataseries and thus close chart
        dispatch(clearDataset());
        const urlLayerKey = getUrlKey(layer);
        toggleRemoveLayer(
          layer,
          map,
          urlLayerKey,
          dispatch,
          removeLayerFromUrl,
        );
      }
    }, [layer, map, dispatch, removeLayerFromUrl, initialOpacity, isAnalysis]);

    const getColorIndicatorKey = useCallback((item: LegendDefinitionItem) => {
      return (
        item.value ||
        (typeof item.label === 'string' ? item?.label : item?.label?.text)
      );
    }, []);

    const renderedLegendDefinitionItems = useMemo(() => {
      return legend?.map((item: LegendDefinitionItem) => (
        <ColorIndicator
          key={getColorIndicatorKey(item)}
          value={getLegendItemLabel(t, item)}
          color={item.color as string}
          opacity={opacity as number}
          fillPattern={fillPattern}
        />
      ));
    }, [fillPattern, getColorIndicatorKey, legend, opacity, t]);

    const renderedLegendUrl = useMemo(() => {
      if (legendUrl) {
        return <img src={legendUrl} alt={title} />;
      }
      return <>{renderedLegendDefinitionItems}</>;
    }, [legendUrl, renderedLegendDefinitionItems, title]);

    const renderedLegend = useMemo(() => {
      if (!legend) {
        return null;
      }
      return <Grid item>{renderedLegendUrl}</Grid>;
    }, [legend, renderedLegendUrl]);

    const renderedChildren = useMemo(() => {
      if (!children) {
        return null;
      }
      return (
        <Grid item>
          <Typography variant="h5">{children}</Typography>
        </Grid>
      );
    }, [children]);

    return (
      <ListItem disableGutters dense>
        <Paper className={classes.paper}>
          <Grid item style={{ display: 'flex' }}>
            <Typography style={{ flexGrow: 1 }} variant="h4">
              {title}
            </Typography>
            <LayerContentPreview layerId={id} />
          </Grid>
          <Divider />
          {renderedLegend}
          <LoadingBar layerId={id} />
          {renderedChildren}
          <Divider style={{ margin: '8px 0px' }} />
          <Box display="flex" justifyContent="space-between">
            <Tooltip title="Opacity">
              <IconButton size="small" onClick={openOpacity}>
                <Opacity fontSize="small" />
              </IconButton>
            </Tooltip>
            <>
              <Popover
                id={opacityId}
                open={open}
                anchorEl={opacityEl}
                onClose={closeOpacity}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
              >
                {renderedOpacitySlider}
              </Popover>
              {isAnalysis ? (
                <AnalysisDownloadButton />
              ) : (
                { layerDownloadOptions }
              )}
              <Tooltip title="Remove layer">
                <IconButton size="small" onClick={remove}>
                  <Close fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          </Box>
        </Paper>
      </ListItem>
    );
  },
);

const styles = () =>
  createStyles({
    paper: {
      padding: 8,
      width: 180,
    },
    slider: {
      padding: '0 5px',
    },
    opacityBox: {
      backgroundColor: '#fff',
      width: 172,
      overflow: 'hidden',
    },
    opacitySliderRoot: {
      color: '#4CA1AD',
      flexGrow: 1,
      padding: '18px 0',
    },
    opacitySliderThumb: {
      backgroundColor: '#4CA1AD',
    },
    opacityText: {
      color: '#4CA1AD',
      marginRight: 5,
      width: 28,
      lineHeight: '36px',
    },
  });

interface LegendItemProps
  extends WithStyles<typeof styles>,
    PropsWithChildren<{}> {
  id?: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendUrl?: string;
  type?: LayerType['type'];
  opacity: LayerType['opacity'];
  isAnalysis?: boolean;
  fillPattern?: 'left' | 'right';
  extent?: Extent;
}

export default withStyles(styles)(LegendItem);
