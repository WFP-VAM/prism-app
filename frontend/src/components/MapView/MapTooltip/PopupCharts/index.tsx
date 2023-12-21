import { AdminLevelType, AdminCodeString } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import PopupAnalysisCharts from './PopupAnalysisCharts';
import PopupChartsList from './PopupChartsList';

const chartLayers = getWMSLayersWithChart();

interface PopupChartsProps {
  setPopupTitle: React.Dispatch<React.SetStateAction<string>>;
  adminCode: AdminCodeString;
  adminSelectorKey: string;
  adminLevel: AdminLevelType | undefined;
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  adminLevelsNames: () => string[];
  availableAdminLevels: AdminLevelType[];
}

const PopupCharts = ({
  setPopupTitle,
  adminCode,
  adminSelectorKey,
  adminLevel,
  setAdminLevel,
  adminLevelsNames,
  availableAdminLevels,
}: PopupChartsProps) => {
  const mapState = useSelector(layersSelector);

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
      {adminLevel === undefined && (
        <PopupChartsList
          adminLevelsNames={adminLevelsNames}
          availableAdminLevels={availableAdminLevels}
          filteredChartLayers={filteredChartLayers}
          setAdminLevel={setAdminLevel}
        />
      )}
      {adminLevel !== undefined && (
        <PopupAnalysisCharts
          adminCode={adminCode}
          adminSelectorKey={adminSelectorKey}
          adminLevel={adminLevel}
          onClose={setAdminLevel}
          adminLevelsNames={adminLevelsNames}
          filteredChartLayers={filteredChartLayers}
        />
      )}
    </>
  );
};

export default memo(PopupCharts);
