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
  Theme,
  Tooltip,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { Close, Opacity } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { LayerType, LegendDefinitionItem } from '../../../../config/types';
import {
  mapSelector,
  layersSelector,
} from '../../../../context/mapStateSlice/selectors';
// import { removeLayer } from '../../../../context/mapStateSlice';
import { useSafeTranslation } from '../../../../i18n';
import { setAnalysisLayerOpacity } from '../../../../context/analysisResultStateSlice';
import LayerContentPreview from '../layerContentPreview';
import { handleChangeOpacity } from '../handleChangeOpacity';
import ColorIndicator from '../ColorIndicator';
import { getLegendItemLabel } from '../../utils';
import { Extent } from '../../Layers/raster-utils';
import LoadingBar from '../LoadingBar';
import LayerDownloadOptions from '../../LeftPanel/layersPanel/MenuSwitch/SwitchItem/LayerDownloadOptions';

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
    displayOpacitySlider,
    fillPattern,
    extent,
  }: LegendItemProps) => {
    const dispatch = useDispatch();
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
        dispatch(setAnalysisLayerOpacity(val));
      },
      [dispatch],
    );

    const selectedLayers = useSelector(layersSelector);
    const layer = useMemo(() => {
      return selectedLayers.find(l => l.id === id);
    }, [id, selectedLayers]);

    const renderedOpacitySlider = useMemo(() => {
      if (!displayOpacitySlider) {
        return null;
      }
      return (
        <Grid item className={classes.slider}>
          <Box px={1}>
            <Slider
              value={opacity}
              step={0.01}
              min={0}
              max={1}
              aria-labelledby="opacity-slider"
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
        </Grid>
      );
    }, [
      classes.slider,
      displayOpacitySlider,
      handleChangeOpacityValue,
      id,
      map,
      opacity,
      type,
    ]);

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
          {renderedOpacitySlider}
          {renderedLegend}
          <LoadingBar layerId={id} />
          {renderedChildren}
          <Box display="flex" justifyContent="flex-end">
            <Tooltip title="Opacity">
              <IconButton size="small" onClick={openOpacity}>
                <Opacity fontSize="small" />
              </IconButton>
            </Tooltip>
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
            </Popover>
            {layer && (
              <LayerDownloadOptions
                layer={layer}
                extent={extent}
                selected
                size="small"
              />
            )}
            <Tooltip title="Close layer">
              <IconButton size="small">
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      </ListItem>
    );
  },
);

const styles = (theme: Theme) =>
  createStyles({
    paper: {
      padding: 8,
      width: 180,
    },
    slider: {
      padding: '0 5px',
    },
    opacityBox: {
      backgroundColor: theme.palette.primary.main,
      overflow: 'hidden',
    },
    opacitySliderRoot: {
      color: '#fff',
      width: 140,
      height: 4,
    },
    opacitySliderThumb: {
      backgroundColor: '#fff',
    },
    opacityText: {
      color: '#fff',
      marginRight: 5,
      width: 28,
      lineHeight: '28px',
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
  displayOpacitySlider?: boolean;
  fillPattern?: 'left' | 'right';
  extent?: Extent;
}

export default withStyles(styles)(LegendItem);
