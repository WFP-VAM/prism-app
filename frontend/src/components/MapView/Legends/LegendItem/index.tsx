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
  makeStyles,
} from '@material-ui/core';
import { Close, Opacity, SwapVert } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { LayerType, LegendDefinitionItem } from 'config/types';
import { mapSelector, layersSelector } from 'context/mapStateSlice/selectors';
import { clearDataset } from 'context/datasetStateSlice';
import { useSafeTranslation } from 'i18n';
import {
  clearAnalysisResult,
  analysisLayerInvertColors,
} from 'context/analysisResultStateSlice';
import LayerContentPreview from 'components/MapView/Legends/layerContentPreview';
import ColorIndicator from 'components/MapView/Legends/ColorIndicator';
import { getLegendItemLabel } from 'components/MapView/utils';
import { Extent } from 'components/MapView/Layers/raster-utils';
import { getUrlKey, useUrlHistory } from 'utils/url-utils';
import LayerDownloadOptions from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch/SwitchItem/LayerDownloadOptions';
import AnalysisDownloadButton from 'components/MapView/Legends//AnalysisDownloadButton';
import { toggleRemoveLayer } from 'components/MapView/LeftPanel/layersPanel/MenuItem/MenuSwitch/SwitchItem/utils';
import { opacitySelector, setOpacity } from 'context/opacityStateSlice';
import { lightGrey } from 'muiTheme';
import LoadingBar from '../LoadingBar';
import LegendMarkdown from '../LegendMarkdown';

// Children here is legendText
const LegendItem = memo(
  ({
    id,
    title,
    legend,
    type,
    opacity: initialOpacity,
    children,
    legendUrl,
    fillPattern,
    extent,
    forPrinting = false,
    showDescription = true,
  }: LegendItemProps) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const { removeLayerFromUrl } = useUrlHistory();
    const map = useSelector(mapSelector);
    const [opacityEl, setOpacityEl] = useState<HTMLButtonElement | null>(null);
    const opacity = useSelector(opacitySelector(id as string));
    const isAnalysis = type === 'analysis';

    useEffect(() => {
      if (opacity !== undefined) {
        return;
      }
      dispatch(
        setOpacity({
          map,
          value: initialOpacity || 0,
          layerId: id,
          layerType: type,
        }),
      );
    }, [dispatch, id, initialOpacity, map, opacity, type]);

    const { t } = useSafeTranslation();

    const openOpacity = (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpacityEl(event.currentTarget);
    };

    const closeOpacity = () => {
      setOpacityEl(null);
    };

    const open = Boolean(opacityEl);
    const opacityId = open ? 'opacity-popover' : undefined;

    const selectedLayers = useSelector(layersSelector);
    const layer = useMemo(
      () => selectedLayers.find(l => l.id === id),
      [id, selectedLayers],
    );

    const renderedOpacitySlider = useMemo(
      () => (
        <Box
          style={{
            paddingLeft: 2,
            paddingRight: 2,
            display: 'flex',
          }}
          className={classes.opacityBox}
        >
          <Typography classes={{ root: classes.opacityText }}>
            {`${Math.round((opacity || 0) * 100)}%`}
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
            onChange={(_e, newValue) =>
              dispatch(
                setOpacity({
                  map,
                  value: newValue as number,
                  layerId: id,
                  layerType: type,
                }),
              )
            }
          />
        </Box>
      ),
      [
        classes.opacityBox,
        classes.opacitySliderRoot,
        classes.opacitySliderThumb,
        classes.opacityText,
        dispatch,
        id,
        map,
        opacity,
        type,
      ],
    );

    const layerDownloadOptions = useMemo(
      () =>
        layer ? (
          <LayerDownloadOptions
            layerId={layer.id}
            extent={extent}
            selected
            size="small"
          />
        ) : null,
      [layer, extent],
    );

    const remove = useCallback(() => {
      if (isAnalysis) {
        dispatch(clearAnalysisResult());
      }
      if (layer) {
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
    }, [isAnalysis, layer, dispatch, map, removeLayerFromUrl]);

    const getColorIndicatorKey = useCallback(
      (item: LegendDefinitionItem) =>
        item.value ||
        (typeof item.label === 'string' ? item?.label : item?.label?.text),
      [],
    );

    const renderedLegendDefinitionItems = useMemo(
      () =>
        legend?.map((item: LegendDefinitionItem) => (
          <ColorIndicator
            key={getColorIndicatorKey(item)}
            value={getLegendItemLabel(t, item)}
            color={item.color as string}
            opacity={opacity as number}
            fillPattern={fillPattern || item.fillPattern}
          />
        )),
      [fillPattern, getColorIndicatorKey, legend, opacity, t],
    );

    const renderedLegendUrl = useMemo(() => {
      if (legendUrl) {
        return <img src={legendUrl} alt={title} />;
      }
      return renderedLegendDefinitionItems;
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
          {typeof children === 'string' ? (
            <LegendMarkdown>{children}</LegendMarkdown>
          ) : (
            <Typography variant="h5">{children}</Typography>
          )}
        </Grid>
      );
    }, [children]);

    return (
      <ListItem disableGutters dense>
        <Paper
          className={classes.paper}
          elevation={forPrinting ? 0 : undefined}
          style={
            forPrinting
              ? {
                  border: `1px solid ${lightGrey}`,
                }
              : undefined
          }
        >
          <Grid item style={{ display: 'flex' }}>
            <Typography style={{ flexGrow: 1 }} variant="h4">
              {title}
            </Typography>
            <LayerContentPreview layerId={id} />
          </Grid>
          <Divider />
          {renderedLegend}
          {showDescription && (
            <>
              <LoadingBar layerId={id} />
              {renderedChildren}
            </>
          )}
          {!forPrinting && (
            <>
              <Divider style={{ margin: '8px 0px' }} />
              <Box
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <Tooltip title={t('Opacity') as string}>
                  <IconButton size="small" onClick={openOpacity}>
                    <Opacity fontSize="small" />
                  </IconButton>
                </Tooltip>
                {isAnalysis && (
                  <Tooltip title={t('Reverse colors') as string}>
                    <IconButton
                      size="small"
                      onClick={() => dispatch(analysisLayerInvertColors())}
                    >
                      <SwapVert fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
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
                    layerDownloadOptions
                  )}
                  <Tooltip title={t('Remove layer') as string}>
                    <IconButton size="small" onClick={remove}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              </Box>
            </>
          )}
        </Paper>
      </ListItem>
    );
  },
);

const useStyles = makeStyles(() =>
  createStyles({
    paper: {
      padding: 8,
      width: 180,
      borderRadius: '8px',
    },
    slider: {
      padding: '0 5px',
    },
    opacityBox: {
      backgroundColor: 'white',
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
  }),
);

interface LegendItemProps extends PropsWithChildren<{}> {
  id: LayerType['id'];
  title: LayerType['title'];
  legend: LayerType['legend'];
  legendUrl?: string;
  type: LayerType['type'] | 'analysis';
  opacity: LayerType['opacity'];
  fillPattern?: 'left' | 'right';
  extent?: Extent;
  forPrinting?: boolean;
  showDescription?: boolean;
}

export default LegendItem;
