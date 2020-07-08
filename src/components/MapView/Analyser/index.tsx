/* eslint-disable no-console */
// TODO remove above
import React, { useMemo, useState } from 'react';
import {
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListSubheader,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { ArrowDropDown, Assessment } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { find, map } from 'lodash';
import bbox from '@turf/bbox';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  AggregationOperations,
  BoundaryLayerProps,
  LayerKey,
  LayerType,
  NSOLayerProps,
  WMSLayerProps,
} from '../../../config/types';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice';
import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import {
  AnalysisDispatchParams,
  analysisResultSelector,
  isAnalysisLoadingSelector,
  requestAndStoreAnalysis,
} from '../../../context/analysisResultStateSlice';
import AnalysisTable from './AnalysisTable';
import { menuList } from '../../NavBar/utils';

const layers = Object.values(LayerDefinitions);
const baselineLayers = layers.filter(
  (layer): layer is NSOLayerProps => layer.type === 'nso',
);
const hazardLayers = layers.filter(
  (layer): layer is WMSLayerProps => layer.type === 'wms',
);

const boundaryLayer = getBoundaryLayerSingleton();

function Analyser({ classes }: AnalyserProps) {
  const dispatch = useDispatch();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const availableDates = useSelector(availableDatesSelector);
  const analysisResult = useSelector(analysisResultSelector);
  const isAnalysisLoading = useSelector(isAnalysisLoadingSelector);

  const [openAnalyserForm, setOpenAnalyserForm] = useState(false);
  const [hazardLayerId, setHazardLayerId] = useState(hazardLayers[0].id);
  const [statistic, setStatistic] = useState(AggregationOperations.Mean);
  const [baselineLayerId, setBaselineLayerId] = useState(baselineLayers[0].id);

  const [openResult, setOpenResult] = useState(false);

  const onOptionChange = (setterFunc: (val: any) => void) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setterFunc((event.target as HTMLInputElement).value);
  };

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData)
      // not loaded yet. Should be loaded in MapView
      return null;
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const statisticOptions = map(Object.entries(AggregationOperations), stat => {
    return (
      <FormControlLabel
        key={stat[0]}
        value={stat[1]}
        control={<Radio className={classes.radioOptions} size="small" />}
        label={stat[0]}
      />
    );
  });

  const runAnalyser = async () => {
    if (!adminBoundariesExtent) return; // hasn't been calculated yet

    const selectedHazardLayer = find(hazardLayers, {
      id: hazardLayerId,
    }) as WMSLayerProps;
    const selectedBaselineLayer = find(baselineLayers, {
      id: baselineLayerId,
    }) as NSOLayerProps;
    const params: AnalysisDispatchParams = {
      hazardLayer: selectedHazardLayer,
      baselineLayer: selectedBaselineLayer,
      date: availableDates[selectedHazardLayer.serverLayerName][0], // TODO load from ui
      statistic,
      extent: adminBoundariesExtent,
      threshold: {}, // TODO load from ui
    };

    const data = await dispatch(requestAndStoreAnalysis(params));

    // TODO remove
    // eslint-disable-next-line no-console
    console.log(data);
  };

  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setOpenAnalyserForm(!openAnalyserForm);
          setOpenResult(false);
        }}
      >
        <Assessment style={{ marginRight: '10px' }} />
        <Typography variant="body2">Run Analysis</Typography>
        <ArrowDropDown />
      </Button>

      {isAnalysisLoading || analysisResult
        ? [
            <Button
              key="show"
              variant="contained"
              color="primary"
              className={classes.analyserButton}
              onClick={() => {
                setOpenAnalyserForm(false);
                setOpenResult(!openResult);
              }}
              disabled={isAnalysisLoading}
            >
              <Typography variant="body2">Show Result</Typography>
            </Button>,
          ]
        : ''}

      <div
        className={classes.analyserMenu}
        style={{
          // eslint-disable-next-line no-nested-ternary
          width: openAnalyserForm ? '40vw' : openResult ? 'min-content' : 0,
          padding: openAnalyserForm || openResult ? 10 : 0,
        }}
      >
        {openAnalyserForm ? (
          <div>
            <div className={classes.newAnalyserContainer}>
              <div>
                <Typography variant="body2">
                  Step 1 - Choose a hazard Layer:
                </Typography>
                <LayerSelector
                  type="wms"
                  value={hazardLayerId}
                  setValue={setHazardLayerId}
                  title="Hazard Layer"
                  classes={classes}
                />
              </div>
              <div>
                <Typography variant="body2">
                  Step 2 - Select a statistic:
                </Typography>

                <FormControl component="div">
                  <RadioGroup
                    name="statistics"
                    value={statistic}
                    onChange={onOptionChange(setStatistic)}
                    row
                  >
                    {statisticOptions}
                  </RadioGroup>
                </FormControl>
              </div>
              <div>
                <Typography variant="body2">
                  Step 3 - Choose a baseline Layer:
                </Typography>
                <LayerSelector
                  type="nso"
                  value={baselineLayerId}
                  setValue={setBaselineLayerId}
                  title="Baseline Layer"
                  classes={classes}
                />
              </div>
            </div>
            <Button
              className={classes.innerAnalysisButton}
              onClick={runAnalyser}
            >
              <Typography variant="body2">Run Analysis</Typography>
            </Button>
            {isAnalysisLoading || analysisResult ? (
              <>
                <Button
                  className={classes.innerAnalysisButton}
                  disabled={isAnalysisLoading}
                >
                  <Typography variant="body2">Show Result</Typography>
                </Button>
              </>
            ) : (
              ''
            )}
          </div>
        ) : (
          <div>
            <FormControl component="div">
              <RadioGroup row>
                <FormControlLabel
                  value="mapview"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Map View"
                />
                <FormControlLabel
                  value="tableview"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Table View"
                />
              </RadioGroup>
            </FormControl>
            {analysisResult && analysisResult.tableData ? (
              <AnalysisTable analysisResult={analysisResult} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function LayerSelector({
  type,
  classes,
  value,
  setValue,
  title,
}: LayerSelectorProps) {
  const categories = menuList // we could memo this but it isn't impacting performance, for now
    // 1. flatten to just the layer categories, don't need the big menus
    .flatMap(menu => menu.layersCategories)
    // 2. get rid of layers within the categories which don't match the given type
    .map(category => ({
      ...category,
      layers: category.layers.filter(layer => layer.type === type),
    }))
    // 3. filter categories which don't have any layers at the end of it all.
    .filter(category => category.layers.length > 0);
  const defaultValue = categories[0].layers[0].id;
  if (!value) {
    setTimeout(() => setValue(defaultValue));
    return null;
  }

  return (
    <FormControl className={classes.selector}>
      <InputLabel htmlFor={`${title}-select`} className={classes.selectorLabel}>
        {title}
      </InputLabel>
      <Select
        defaultValue={defaultValue}
        value={value}
        onChange={e => {
          setValue(e.target.value as LayerKey);
        }}
        id={`${title}-select`}
      >
        {categories.reduce(
          (components, category) => [
            ...components,
            <ListSubheader key={category.title}>
              <Typography variant="body2" color="primary">
                {category.title}
              </Typography>
            </ListSubheader>,
            ...category.layers.map(layer => (
              <MenuItem
                style={{ color: 'black' }}
                key={layer.id}
                value={layer.id}
              >
                {layer.title}
              </MenuItem>
            )),
          ],
          [] as any[],
        )}
      </Select>
    </FormControl>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    analyser: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: 2,
      left: 2,
      textAlign: 'left',
    },
    analyserMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      color: 'white',
      overflowX: 'hidden',
      // transition: 'width 0.5s ease-in-out',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: 'auto',
      maxHeight: '60vh',
    },
    analyserButton: {
      height: '36px',
      'margin-left': '3px',
    },
    analyserOptions: {
      color: 'white',
      padding: '2px 5px',
    },
    newAnalyserContainer: {
      padding: '5px',
      marginTop: '10px',
    },
    radioOptions: {
      color: 'white',
      padding: '2px 10px 2px 20px',
    },
    innerAnalysisButton: {
      backgroundColor: '#3d474a',
    },
    selectorLabel: {
      '&.Mui-focused': { color: 'white' },
    },
    selector: {
      margin: '20px 5px',
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

interface LayerSelectorProps extends WithStyles<typeof styles> {
  type: LayerType['type'];
  value: LayerKey;
  setValue: (val: LayerKey) => void;
  title: string;
}

export default withStyles(styles)(Analyser);
