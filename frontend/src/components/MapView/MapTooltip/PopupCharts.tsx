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
import React, { memo, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  IconButton,
  Typography,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { GeoJsonProperties } from 'geojson';

import ChartSection from '../LeftPanel/ChartsPanel/ChartSection';
import { oneYearInMs } from '../LeftPanel/utils';
import DownloadCsvButton from '../DownloadCsvButton';
import { buildCsvFileName } from '../utils';

const chartLayers = getWMSLayersWithChart();
const { countryAdmin0Id, country, multiCountry } = appConfig;
const MAX_ADMIN_LEVEL = appConfig.multiCountry ? 3 : 2;
const boundaryLayer = getBoundaryLayersByAdminLevel(MAX_ADMIN_LEVEL);

const getProperties = (
  layerData: LayerData<BoundaryLayerProps>['data'],
  name?: string,
) => {
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
      alignItems: 'start',
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
    selectLevelButtonText: {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      maxWidth: '280px',
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
      flexDirection: 'column',
      gap: '8px',
    },
    chartContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    chartSection: {
      height: '240px',
      width: '400px',
      flexGrow: 1,
    },
  });

interface PopupChartProps extends WithStyles<typeof styles> {
  popupTitle: string;
}

const PopupChart = ({ popupTitle, classes }: PopupChartProps) => {
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const mapState = useSelector(layersSelector);
  const dataForCsv = useRef<{ [key: string]: any[] }>({});
  const [adminLevel, setAdminLevel] = useState<0 | 1 | 2>(0);
  const [adminProperties, setAdminProperties] = useState<GeoJsonProperties>(
    null,
  );

  // keep only level 1 and 2
  // eslint-disable-next-line fp/no-mutating-methods
  const adminLevelsNames = popupTitle.split(', ').splice(0, 2);

  useEffect(() => {
    if (adminLevel > 0 && data) {
      setAdminProperties(
        getProperties(
          data as BoundaryLayerData,
          adminLevelsNames[adminLevel - 1],
        ),
      );
    }
  }, [adminLevel, data, adminLevelsNames]);

  if (mapState.length < 4) {
    return null;
  }

  const startDate1 = new Date().getTime() - oneYearInMs;
  const endDate1 = new Date().getTime();

  const filteredMapState = mapState.slice(3).map(item => item.id);
  const filteredChartLayers = chartLayers.filter(item =>
    filteredMapState.includes(item.id),
  );

  return (
    <>
      {adminLevel === 0 && (
        <div className={classes.selectChartContainer}>
          {filteredChartLayers.map(layer =>
            adminLevelsNames.map((level, index) => (
              <Button
                key={level}
                variant="text"
                size="small"
                className={classes.selectLevelButton}
                onClick={() => setAdminLevel((index + 1) as 0 | 1 | 2)}
              >
                <div className={classes.selectLevelButtonValue}>
                  <div className={classes.selectLevelButtonText}>
                    View {level} {layer.title} chart
                  </div>
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </div>
              </Button>
            )),
          )}
        </div>
      )}
      {adminLevel > 0 && adminProperties && (
        <>
          <Typography component="p" variant="h4" color="inherit">
            {adminLevelsNames[adminLevel - 1]}
          </Typography>
          <div className={classes.chartsContainer}>
            <IconButton
              aria-label="close"
              className={classes.closeButton}
              onClick={() => setAdminLevel(0)}
              size="small"
            >
              <FontAwesomeIcon icon={faTimes} />
            </IconButton>
            <div className={classes.charts}>
              {filteredChartLayers.map(item => (
                <div className={classes.chartContainer}>
                  <div className={classes.chartSection}>
                    <ChartSection
                      key={item.id}
                      chartLayer={item}
                      adminProperties={adminProperties}
                      adminLevel={adminLevel}
                      startDate={startDate1 as number}
                      endDate={endDate1 as number}
                      dataForCsv={dataForCsv}
                    />
                  </div>
                  <div className="downloadButton">
                    <DownloadCsvButton
                      firstCsvFileName={buildCsvFileName([
                        multiCountry ? countryAdmin0Id : country,
                        ...adminLevelsNames,
                        item.title,
                      ])}
                      dataForCsv={dataForCsv}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default memo(withStyles(styles)(PopupChart));
