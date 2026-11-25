import { AdminCodeString, AdminLevelType } from 'config/types';
import { getWMSLayersWithChart } from 'config/utils';
import { layersSelector } from 'context/mapStateSlice/selectors';
import React, { memo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useEffectiveCountryAdmin0Id } from 'utils/universal-country-admin';

import PopupAnalysisCharts from './PopupAnalysisCharts';
import PopupChartsList from './PopupChartsList';
import { hasChartAdminId } from './utils';

const chartLayers = getWMSLayersWithChart();

interface PopupChartsProps {
  setPopupTitle: React.Dispatch<React.SetStateAction<string>>;
  adminCode: AdminCodeString;
  adminSelectorKey: string;
  selectorProperties?: GeoJSON.GeoJsonProperties;
  adminLevel: AdminLevelType | undefined;
  setAdminLevel: React.Dispatch<
    React.SetStateAction<AdminLevelType | undefined>
  >;
  adminLevelsNames: () => string[];
  availableAdminLevels: AdminLevelType[];
}

const PopupCharts = memo(
  ({
    setPopupTitle,
    adminCode,
    adminSelectorKey,
    selectorProperties,
    adminLevel,
    setAdminLevel,
    adminLevelsNames,
    availableAdminLevels,
  }: PopupChartsProps) => {
    const mapState = useSelector(layersSelector);
    const countryAdmin0Id = useEffectiveCountryAdmin0Id();

    const mapStateIds = mapState.map(item => item.id);
    const filteredChartLayers = chartLayers.filter(item =>
      mapStateIds.includes(item.id),
    );

    // adminLevel persists across map clicks, so clicking a new area re-opens
    // the chart at the previously chosen level. If that area has no HDC id at
    // that level (e.g. a null dv_adm2_id), go back to the level selection
    // list, which only offers the levels that can be charted.
    const canChartAdminLevel =
      adminLevel === undefined ||
      filteredChartLayers.some(layer =>
        hasChartAdminId(layer, selectorProperties, adminLevel, countryAdmin0Id),
      );

    useEffect(() => {
      if (!canChartAdminLevel) {
        setAdminLevel(undefined);
      }
    }, [canChartAdminLevel, setAdminLevel]);

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
            selectorProperties={selectorProperties}
            setAdminLevel={setAdminLevel}
          />
        )}
        {adminLevel !== undefined && canChartAdminLevel && (
          <PopupAnalysisCharts
            adminLevelsNames={adminLevelsNames}
            adminCode={adminCode}
            adminSelectorKey={adminSelectorKey}
            selectorProperties={selectorProperties}
            adminLevel={adminLevel}
            filteredChartLayers={filteredChartLayers}
          />
        )}
      </>
    );
  },
);

export default PopupCharts;
