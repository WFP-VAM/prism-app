import { Drawer } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import { LayersCategoryType, MenuItemType, PanelSize } from 'config/types';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import LeftPanelTabs from './LeftPanelTabs';
import TablesPanel from './TablesPanel';
import { menuList } from './utils';

const LeftPanel = memo(
  ({ panelSize, setPanelSize, isPanelHidden }: LeftPanelProps) => {
    const [
      resultsPage,
      setResultsPage,
    ] = React.useState<React.JSX.Element | null>(null);

    const tablesMenuItems = useMemo(() => {
      return menuList.filter((menuItem: MenuItemType) => {
        return menuItem.layersCategories.some(
          (layerCategory: LayersCategoryType) => {
            return layerCategory.tables.length > 0;
          },
        );
      });
    }, []);

    const areTablesAvailable = useMemo(() => {
      return tablesMenuItems.length >= 1;
    }, [tablesMenuItems.length]);

    return (
      <Drawer
        PaperProps={{
          style: {
            width: panelSize,
            marginTop: '7vh',
            height: '93%',
            backgroundColor: '#F5F7F8',
            maxWidth: '100%',
          },
        }}
        variant="persistent"
        anchor="left"
        open={!isPanelHidden}
      >
        <LeftPanelTabs
          panelSize={panelSize}
          setPanelSize={setPanelSize}
          areTablesAvailable={areTablesAvailable}
          resultsPage={resultsPage}
          chartsPanel={
            <ChartsPanel
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
          analysisPanel={
            <AnalysisPanel
              panelSize={panelSize}
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
          tablesPanel={
            <TablesPanel
              tablesMenuItems={tablesMenuItems}
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
        />
      </Drawer>
    );
  },
);

interface LeftPanelProps {
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  isPanelHidden: boolean;
}

export default LeftPanel;
