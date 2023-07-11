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
  ListItem,
  Paper,
  Slider,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { LayerType, LegendDefinitionItem } from 'config/types';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useSafeTranslation } from 'i18n';
import { setAnalysisLayerOpacity } from 'context/analysisResultStateSlice';
import LayerContentPreview from 'components/MapView/Legends/layerContentPreview';
import { handleChangeOpacity } from 'components/MapView/Legends/handleChangeOpacity';
import ColorIndicator from 'components/MapView/Legends/ColorIndicator';
import { getLegendItemLabel } from 'components/MapView/utils';
import LoadingBar from 'components/MapView/Legends/LoadingBar';

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
  }: LegendItemProps) => {
    const dispatch = useDispatch();
    const map = useSelector(mapSelector);
    const [opacity, setOpacityValue] = useState<number | number[]>(
      initialOpacity || 0,
    );

    useEffect(() => {
      setOpacityValue(initialOpacity || 0);
    }, [initialOpacity]);

    const { t } = useSafeTranslation();

    const handleChangeOpacityValue = useCallback(
      val => {
        setOpacityValue(val);
        dispatch(setAnalysisLayerOpacity(val));
      },
      [dispatch],
    );

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
}

export default withStyles(styles)(LegendItem);
