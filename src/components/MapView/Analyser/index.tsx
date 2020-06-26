/* eslint-disable no-console */
import React, { useMemo, useState } from 'react';
import {
  Button,
  createStyles,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Theme,
  Typography,
  withStyles,
  WithStyles,
} from '@material-ui/core';
import { Assessment, ArrowDropDown } from '@material-ui/icons';
import { useSelector } from 'react-redux';
import { map, find } from 'lodash';
import bbox from '@turf/bbox';
import {
  getBoundaryLayerSingleton,
  LayerDefinitions,
} from '../../../config/utils';
import {
  AggregationOperations,
  BoundaryLayerProps,
  NSOLayerProps,
  WMSLayerProps,
} from '../../../config/types';
import { getWCSLayerUrl } from '../../../context/layers/wms';
import { LayerData } from '../../../context/layers/layer-data';
import { layerDataSelector } from '../../../context/mapStateSlice';
import { Extent } from '../Layers/raster-utils';
import { availableDatesSelector } from '../../../context/serverStateSlice';
import { ApiData, fetchApiData } from '../../../utils/analysis-utils';

const layers = Object.values(LayerDefinitions);
const baselineLayers = layers.filter(
  (layer): layer is NSOLayerProps => layer.type === 'nso',
);
const hazardLayers = layers.filter(
  (layer): layer is WMSLayerProps => layer.type === 'wms',
);

const boundaryLayer = getBoundaryLayerSingleton();

const apiUrl = 'https://prism-api.ovio.org/stats'; // TODO both needs to be stored somewhere
const adminJson =
  'https://prism-admin-boundaries.s3.us-east-2.amazonaws.com/mng_admin_boundaries.json';
async function submitAnalysisRequest(
  baselineLayer: NSOLayerProps,
  hazardLayer: WMSLayerProps,
  extent: Extent,
  date: number,
  statistic: AggregationOperations, // we cant use AggregateOptions here but we should aim to in the future.
): Promise<Array<object>> {
  const apiRequest: ApiData = {
    geotiff_url: getWCSLayerUrl({
      layer: hazardLayer,
      date,
      extent,
    }),
    zones_url:
      process.env.NODE_ENV === 'production'
        ? window.location.origin +
          getBoundaryLayerSingleton().path.replace('.', '')
        : adminJson,
    // TODO needs to be a level in admin_boundaries, admin_level for group_by
  };
  const data = await fetchApiData(apiUrl, apiRequest);

  return data;
}

function Analyser({ classes }: AnalyserProps) {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const availableDates = useSelector(availableDatesSelector);

  const [open, setOpen] = useState(true);
  // const [analyserOption, setAnalyserOption] = useState('new');
  const [hazardLayerId, setHazardLayerId] = useState(
    hazardLayers[0].id as string,
  );
  const [statistic, setStatistic] = useState(AggregationOperations.mean);
  const [baselineLayerId, setBaselineLayerId] = useState(
    baselineLayers[0].id as string,
  );

  const onOptionChange = (setterFunc: (val: any) => void) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setterFunc((event.target as HTMLInputElement).value);
  };

  const adminBoundariesExtent = useMemo(() => {
    if (!boundaryLayerData)
      // not loaded yet. Should be loaded in MapView
      return undefined;
    return bbox(boundaryLayerData.data) as Extent; // we get extents of admin boundaries to give to the api.
  }, [boundaryLayerData]);

  const hazardLayerOptions = map(hazardLayers, hazardLayer => {
    return (
      <FormControlLabel
        key={hazardLayer.id}
        value={hazardLayer.id}
        control={<Radio className={classes.radioOptions} size="small" />}
        label={hazardLayer.title}
      />
    );
  });
  const baselineLayerOptions = map(baselineLayers, baselineLayer => {
    return (
      <FormControlLabel
        key={baselineLayer.id}
        value={baselineLayer.id}
        control={<Radio className={classes.radioOptions} size="small" />}
        label={baselineLayer.title}
      />
    );
  });
  const statisticOptions = map(Object.keys(AggregationOperations), stat => {
    return (
      <FormControlLabel
        key={stat}
        value={stat}
        control={<Radio className={classes.radioOptions} size="small" />}
        label={stat}
      />
    );
  });

  const runAnalyser = () => {
    if (!adminBoundariesExtent) return;
    const selectedHazardLayer = find(hazardLayers, {
      id: hazardLayerId,
    }) as WMSLayerProps;
    const selectedBaselineLayer = find(baselineLayers, {
      id: baselineLayerId,
    }) as NSOLayerProps;

    submitAnalysisRequest(
      selectedBaselineLayer,
      selectedHazardLayer,
      adminBoundariesExtent,
      availableDates[selectedHazardLayer.serverLayerName][0],
      statistic,
    )
      .then(res => {
        const data = res;
        // eslint-disable-next-line no-console
        console.log(data);
      })
      .catch(err => console.error('error', err));
  };
  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
      >
        <Assessment style={{ marginRight: '10px' }} />
        <Typography variant="body2">Run Analysis</Typography>
        <ArrowDropDown />
      </Button>

      <Button
        variant="contained"
        color="primary"
        className={classes.analyserButton}
      >
        <Typography variant="body2">Show Result</Typography>
      </Button>
      <Button
        variant="contained"
        color="primary"
        className={classes.analyserButton}
      >
        <Typography variant="body2">Download</Typography>
      </Button>

      <div
        className={classes.analyserMenu}
        style={{ width: open ? '40vw' : 0, padding: open ? 10 : 0 }}
      >
        {/* <FormControl component="fieldset">
          <RadioGroup value={analyserOption} onChange={onAnalyserOptionChange} row>
            <FormControlLabel
              value="new"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Create a new analysis"
            />
            <FormControlLabel
              value="pre-configure"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Run a pre-configured analysis"
            />
            <FormControlLabel
              value="generate"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Generate spatial statistics"
            />
          </RadioGroup>
        </FormControl> */}
        <div className={classes.newAnalyserContainer}>
          <div>
            <Typography variant="body2">
              Step 1 - Choose a hazard Layer:
            </Typography>

            <FormControl component="div">
              <RadioGroup
                name="hazardLayer"
                value={hazardLayerId}
                onChange={onOptionChange(setHazardLayerId)}
              >
                {hazardLayerOptions}
              </RadioGroup>
            </FormControl>
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
            <FormControl component="div">
              <RadioGroup
                name="baselineLayer"
                value={baselineLayerId}
                onChange={onOptionChange(setBaselineLayerId)}
              >
                {baselineLayerOptions}
              </RadioGroup>
            </FormControl>
          </div>
        </div>
        <Button onClick={runAnalyser}>
          <Typography variant="body2">Run Analysis</Typography>
        </Button>
        <Button>
          <Typography variant="body2">Show Result</Typography>
        </Button>
        <Button>
          <Typography variant="body2">Download</Typography>
        </Button>
      </div>
    </div>
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
      height: '600px',
      maxHeight: '90vh',
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
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
