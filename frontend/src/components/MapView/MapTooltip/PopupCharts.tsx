import { appConfig } from 'config';
import { BoundaryLayerProps } from 'config/types';
import {
  getBoundaryLayersByAdminLevel,
  getWMSLayersWithChart,
} from 'config/utils';
import { BoundaryLayerData } from 'context/layers/boundary';
import { LayerData } from 'context/layers/layer-data';
import {
  layerDataSelector,
  layersSelector,
} from 'context/mapStateSlice/selectors';
import React, { memo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  IconButton,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';

import ChartSection from '../LeftPanel/ChartsPanel/ChartSection';

const chartLayers = getWMSLayersWithChart();
const MAX_ADMIN_LEVEL = appConfig.multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

const getProperties = (
  layerData: LayerData<BoundaryLayerProps>['data'],
  name?: string,
) => {
  // Return any properties, used for national level data.
  if (!name) {
    return layerData.features[0].properties;
  }

  const features = layerData.features.filter(
    elem =>
      (elem.properties && elem.properties.Adm1_Name === name) ||
      (elem.properties && elem.properties.Adm2_Name === name),
  );

  if (!features) {
    return null;
  }

  return features[0].properties;
};

const styles = () =>
  createStyles({
    selectChartContainer: {
      display: 'flex',
      flexDirection: 'column',
    },
    selectLevelButton: {
      textTransform: 'none',
    },
    selectLevelButtonValue: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      justifyContent: 'start',
    },
    closeButton: {
      color: 'white',
      position: 'absolute',
      right: 0,
      top: 0,
    },
    chartsContainer: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    charts: {
      display: 'flex',
      height: '200px',
      flexDirection: 'column',
      gap: '8px',
    },
  });

interface PopupChartProps extends WithStyles<typeof styles> {
  popupTitle: string;
}

const PopupChart = ({ popupTitle, classes }: PopupChartProps) => {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const mapState = useSelector(layersSelector);
  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const [adminLevel, setAdminLevel] = useState<0 | 1 | 2>(0);

  if (mapState.length < 4) {
    return null;
  }

  const { data } = boundaryLayerData || {};

  const oneDayInMs = 24 * 60 * 60 * 1000;
  const oneYearInMs = 365 * oneDayInMs;
  const startDate1 = new Date().getTime() - oneYearInMs;
  const endDate1 = new Date().getTime();

  const filteredMapState = mapState.slice(3).map(item => item.id);
  const filteredChartLayers = chartLayers.filter(item =>
    filteredMapState.includes(item.id),
  );

  if (filteredChartLayers.length === 0) {
    return null;
  }

  const [admin1, admin2] = popupTitle.split(', ');
  const adminLevelNames = [admin1, admin2].filter(item => item !== undefined);
  const adminProperties =
    data && (admin2 || admin1)
      ? getProperties(data as BoundaryLayerData, admin2 || admin1)
      : undefined;
  if (!adminProperties) {
    return null;
  }

  return (
    <div>
      <div className={classes.selectChartContainer}>
        {adminLevel === 0 &&
          filteredChartLayers.map(layer =>
            adminLevelNames.map((level, index) => (
              <Button
                key={level}
                variant="text"
                size="small"
                className={classes.selectLevelButton}
                onClick={() => setAdminLevel((index + 1) as 0 | 1 | 2)}
              >
                <div className={classes.selectLevelButtonValue}>
                  <div>
                    View {level} {layer.title} chart
                  </div>
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </div>
              </Button>
            )),
          )}
      </div>
      {adminLevel > 0 && (
        <div className={classes.chartsContainer}>
          <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={() => setAdminLevel(0)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
          <div className={classes.charts}>
            {filteredChartLayers.map(item => (
              <ChartSection
                key={item.id}
                chartLayer={item}
                adminProperties={adminProperties}
                adminLevel={adminLevel}
                startDate={startDate1 as number}
                endDate={endDate1 as number}
                dataForCsv={dataForCsv}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(withStyles(styles)(PopupChart));
