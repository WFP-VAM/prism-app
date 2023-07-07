import { createStyles, Drawer, makeStyles, Theme } from '@material-ui/core';
import React, { memo, useMemo } from 'react';
import {
  LayersCategoryType,
  MenuItemType,
  PanelSize,
} from '../../../config/types';
import { Extent } from '../Layers/raster-utils';
import AnalysisPanel from './AnalysisPanel';
import ChartsPanel from './ChartsPanel';
import LayersPanel from './layersPanel';
import LeftPanelTabs from './LeftPanelTabs';
import TablesPanel from './TablesPanel';
import { menuList } from './utils';

interface StyleProps {
  panelSize: PanelSize;
}

const useStyles = makeStyles<Theme, StyleProps>(() =>
  createStyles({
    paper: {
      marginTop: '7vh',
      height: '93%',
      width: ({ panelSize }) => panelSize,
      backgroundColor: '#F5F7F8',
      maxWidth: '100%',
    },
  }),
);

const LeftPanel = memo(
  ({
    extent,
    panelSize,
    setPanelSize,
    isPanelHidden,
    activeLayers,
  }: LeftPanelProps) => {
    const classes = useStyles({ panelSize });
    const [resultsPage, setResultsPage] = React.useState<JSX.Element | null>(
      null,
    );

    const layersMenuItems = useMemo(() => {
      return menuList.filter((menuItem: MenuItemType) => {
        return menuItem.layersCategories.some(
          (layerCategory: LayersCategoryType) => {
            return layerCategory.layers.length > 0;
          },
        );
      });
    }, []);

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
        variant="persistent"
        anchor="left"
        open={!isPanelHidden}
        classes={{ paper: classes.paper }}
      >
        <LeftPanelTabs
          panelSize={panelSize}
          setPanelSize={setPanelSize}
          areTablesAvailable={areTablesAvailable}
          resultsPage={resultsPage}
          activeLayers={activeLayers}
          layersPanel={
            <LayersPanel layersMenuItems={layersMenuItems} extent={extent} />
          }
          chartsPanel={
            <ChartsPanel
              setPanelSize={setPanelSize}
              setResultsPage={setResultsPage}
            />
          }
          analysisPanel={
            <AnalysisPanel
              extent={extent}
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
  extent?: Extent;
  panelSize: PanelSize;
  setPanelSize: React.Dispatch<React.SetStateAction<PanelSize>>;
  isPanelHidden: boolean;
  activeLayers: number;
}

export default LeftPanel;
