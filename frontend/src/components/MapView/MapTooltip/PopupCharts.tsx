import { appConfig } from 'config';
import { AdminLevelType, BoundaryLayerProps } from 'config/types';
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
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faTimes } from '@fortawesome/free-solid-svg-icons';
import {
  Button,
  IconButton,
  WithStyles,
  createStyles,
  withStyles,
} from '@material-ui/core';
import { MapTooltipState } from 'context/tooltipStateSlice';
import i18n, { isEnglishLanguageSelected, useSafeTranslation } from 'i18n';
import ChartSection from '../LeftPanel/ChartsPanel/ChartSection';
import { oneYearInMs } from '../LeftPanel/utils';
import DownloadCsvButton from '../DownloadCsvButton';
import { buildCsvFileName } from '../utils';

const chartLayers = getWMSLayersWithChart();
const { countryAdmin0Id, country, multiCountry } = appConfig;
const availableAdminLevels: AdminLevelType[] = multiCountry
  ? [0, 1, 2]
  : [1, 2];
const boundaryLayer = getBoundaryLayersByAdminLevel();

const getProperties = (
  layerData: LayerData<BoundaryLayerProps>['data'],
  name: string,
) => {
  const features = layerData.features.filter(
    elem => elem.properties && elem.properties[name],
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

interface PopupChartsProps extends WithStyles<typeof styles> {
  popup: MapTooltipState;
  setPopupTitle: React.Dispatch<React.SetStateAction<string>>;
  adminLevel: AdminLevelType | undefined;
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
}

const PopupCharts = ({
  popup,
  setPopupTitle,
  adminLevel,
  setAdminLevel,
  classes,
}: PopupChartsProps) => {
  const { t } = useSafeTranslation();
  const boundaryLayerData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;
  const { data } = boundaryLayerData || {};
  const mapState = useSelector(layersSelector);
  const dataForCsv = useRef<{ [key: string]: any[] }>({});

  // TODO - simplify logic once we revamp admin levels ojbect
  const adminLevelsNames = useCallback(() => {
    const locationName = isEnglishLanguageSelected(i18n)
      ? popup.locationName
      : popup.locationLocalName;
    const splitNames = locationName.split(', ');

    const adminLevelLimit =
      adminLevel === undefined
        ? availableAdminLevels.length
        : adminLevel + (multiCountry ? 1 : 0);
    // If adminLevel is undefined, return the whole array
    // eslint-disable-next-line fp/no-mutating-methods
    return splitNames.splice(0, adminLevelLimit);
  }, [adminLevel, popup.locationLocalName, popup.locationName]);

  const startDate = new Date().getTime() - oneYearInMs;
  const endDate = new Date().getTime();

  const mapStateIds = mapState.map(item => item.id);
  const filteredChartLayers = chartLayers.filter(item =>
    mapStateIds.includes(item.id),
  );

  const levelsConfiguration = filteredChartLayers.map(item => ({
    name: item.id,
    levels: item.chartData?.levels,
  }));

  useEffect(() => {
    if (adminLevel !== undefined) {
      setPopupTitle(adminLevelsNames().join(', '));
    } else {
      setPopupTitle('');
    }
  }, [adminLevel, adminLevelsNames, setPopupTitle]);

  if (filteredChartLayers.length === 0) {
    return null;
  }

  return (
    <>
      {adminLevel === undefined ? (
        <div className={classes.selectChartContainer}>
          {filteredChartLayers.map(layer =>
            adminLevelsNames().map((level, index) => (
              <Button
                key={level}
                variant="text"
                size="small"
                className={classes.selectLevelButton}
                onClick={() =>
                  setAdminLevel(
                    (index +
                      Math.min(...availableAdminLevels)) as AdminLevelType,
                  )
                }
              >
                <div className={classes.selectLevelButtonValue}>
                  <FontAwesomeIcon icon={faChartBar} />
                  <div className={classes.selectLevelButtonText}>
                    {level} - {t(layer.title)}
                  </div>
                </div>
              </Button>
            )),
          )}
        </div>
      ) : (
        <div className={classes.chartsContainer}>
          <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={() => setAdminLevel(undefined)}
            size="small"
          >
            <FontAwesomeIcon icon={faTimes} />
          </IconButton>
          <div className={classes.charts}>
            {filteredChartLayers.map(filteredChartLayer => (
              <div
                key={filteredChartLayer.id}
                className={classes.chartContainer}
              >
                <div className={classes.chartSection}>
                  <ChartSection
                    chartLayer={filteredChartLayer}
                    adminProperties={getProperties(
                      data as BoundaryLayerData,
                      levelsConfiguration
                        .find(
                          levelConfiguration =>
                            levelConfiguration.name === filteredChartLayer.id,
                        )
                        ?.levels?.find(
                          level => level.level === adminLevel.toString(),
                        )?.name ?? '',
                    )}
                    adminLevel={adminLevel}
                    startDate={startDate as number}
                    endDate={endDate as number}
                    dataForCsv={dataForCsv}
                  />
                </div>
                <div className="downloadButton">
                  <DownloadCsvButton
                    filesData={[
                      {
                        fileName: buildCsvFileName([
                          multiCountry ? countryAdmin0Id : country,
                          ...adminLevelsNames(),
                          filteredChartLayer.title,
                        ]),
                        data: dataForCsv,
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default memo(withStyles(styles)(PopupCharts));
