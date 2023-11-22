import { appConfig } from 'config';
import { AdminLevelType } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MapTooltipState } from 'context/tooltipStateSlice';
import i18n, { isEnglishLanguageSelected } from 'i18n';
import PopupAnalysisCharts from './PopupAnalysisCharts';
import PopupChartsList from './PopupChartsList';
import PopupDatasetChart from './PopupDatasetChart';

const chartLayers = getWMSLayersWithChart();
const { multiCountry } = appConfig;
const availableAdminLevels: AdminLevelType[] = multiCountry
  ? [0, 1, 2]
  : [1, 2];

interface PopupChartsProps {
  popup: MapTooltipState;
  setPopupTitle: React.Dispatch<React.SetStateAction<string>>;
  adminLevel: AdminLevelType | undefined;
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  showDataset: boolean;
  setShowDataset: React.Dispatch<React.SetStateAction<boolean>>;
}

const PopupCharts = ({
  popup,
  setPopupTitle,
  adminLevel,
  setAdminLevel,
  showDataset,
  setShowDataset,
}: PopupChartsProps) => {
  const mapState = useSelector(layersSelector);

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

  const mapStateIds = mapState.map(item => item.id);
  const filteredChartLayers = chartLayers.filter(item =>
    mapStateIds.includes(item.id),
  );

  useEffect(() => {
    if (adminLevel !== undefined) {
      setPopupTitle(adminLevelsNames().join(', '));
    } else {
      setPopupTitle('');
    }
  }, [adminLevel, adminLevelsNames, setPopupTitle]);

  return (
    <>
      {adminLevel === undefined && !showDataset && (
        <PopupChartsList
          adminLevelsNames={adminLevelsNames}
          availableAdminLevels={availableAdminLevels}
          filteredChartLayers={filteredChartLayers}
          setAdminLevel={setAdminLevel}
          setShowDataset={setShowDataset}
        />
      )}
      {adminLevel !== undefined && (
        <PopupAnalysisCharts
          adminLevel={adminLevel}
          onClose={setAdminLevel}
          adminLevelsNames={adminLevelsNames}
          filteredChartLayers={filteredChartLayers}
        />
      )}
      {showDataset && (
        <PopupDatasetChart
          onClose={setShowDataset}
          adminLevelsNames={adminLevelsNames}
        />
      )}
    </>
  );
};

export default memo(PopupCharts);
