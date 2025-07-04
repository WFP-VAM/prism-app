/* eslint-disable react/prop-types */
import {
  AppBar,
  createStyles,
  Theme,
  Toolbar,
  makeStyles,
  useTheme,
  useMediaQuery,
} from '@material-ui/core';
import React, { useState } from 'react';
import { useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import {
  BarChartOutlined,
  ImageAspectRatioOutlined,
  LayersOutlined,
  TableChartOutlined,
  TimerOutlined,
  Notifications,
} from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import Legends from 'components/MapView/Legends';
import { areChartLayersAvailable } from 'config/utils';
import {
  areTablesAvailable,
  isAnticipatoryActionDroughtAvailable,
  isAnticipatoryActionStormAvailable,
} from 'components/MapView/LeftPanel/utils';
import { Panel, PanelItem } from 'config/types';
import PanelMenu from './PanelMenu';
import PanelButton from './PanelButton';
import RightSideMenu from './RightSideMenu';
import Title from './Title';

const { alertFormActive } = appConfig;

const panels: PanelItem[] = [
  { panel: Panel.Layers, label: 'Layers', icon: <LayersOutlined /> },
  ...(areChartLayersAvailable
    ? [{ panel: Panel.Charts, label: 'Charts', icon: <BarChartOutlined /> }]
    : []),
  {
    panel: Panel.Analysis,
    label: 'Analysis',
    icon: <ImageAspectRatioOutlined />,
  },
  ...(areTablesAvailable
    ? [{ panel: Panel.Tables, label: 'Tables', icon: <TableChartOutlined /> }]
    : []),
  ...(isAnticipatoryActionDroughtAvailable || isAnticipatoryActionStormAvailable
    ? [
        {
          label: 'A. Actions',
          icon: <TimerOutlined />,
          children: [
            ...(isAnticipatoryActionDroughtAvailable
              ? [
                  {
                    panel: Panel.AnticipatoryActionDrought,
                    label: 'A. Action Drought',
                    icon: <TimerOutlined />,
                  },
                ]
              : []),
            ...(isAnticipatoryActionStormAvailable
              ? [
                  {
                    panel: Panel.AnticipatoryActionStorm,
                    label: 'A. Action Storm',
                    icon: <TimerOutlined />,
                  },
                ]
              : []),
          ],
        },
      ]
    : []),
  ...(alertFormActive
    ? [{ panel: Panel.Alerts, label: '', icon: <Notifications /> }]
    : []),
];

function NavBar() {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const classes = useStyles();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [selectedChild, setSelectedChild] = useState<Record<string, PanelItem>>(
    {},
  );

  const handleMenuOpen = (
    key: string,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    setMenuAnchor(prev => ({ ...prev, [key]: event.currentTarget }));
  };

  const handleMenuClose = (key: string) => {
    setMenuAnchor(prev => ({ ...prev, [key]: null }));
  };

  const handlePanelClick = (panel: Panel) => {
    dispatch(setTabValue(panel));
  };

  const handleChildSelection = (panel: any, child: any) => {
    setSelectedChild({
      [panel.label]: child,
    });
    handleMenuClose(panel.label);
    handlePanelClick(child.panel);
  };

  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar variant="dense">
        <div className={classes.navbarContainer}>
          <div className={classes.leftSideContainer}>
            <Title />
            <div className={classes.panelsContainer}>
              {panels.map(panel => {
                const selected =
                  tabValue === panel.panel ||
                  (panel.children &&
                    panel.children.some(child => tabValue === child.panel));

                const buttonText = selectedChild[panel.label]
                  ? selectedChild[panel.label].label
                  : t(panel.label);

                return (
                  <React.Fragment key={panel.panel}>
                    <PanelButton
                      panel={panel}
                      selected={selected || false}
                      handleClick={e => {
                        if (panel.children) {
                          handleMenuOpen(panel.label, e);
                        } else if (panel.panel) {
                          handlePanelClick(panel.panel);
                        }
                      }}
                      isMobile={!mdUp}
                      buttonText={buttonText}
                    />
                    {panel.children && (
                      <PanelMenu
                        panel={panel}
                        menuAnchor={menuAnchor[panel.label]}
                        handleMenuClose={() => handleMenuClose(panel.label)}
                        handleChildClick={(child: any) =>
                          handleChildSelection(panel, child)
                        }
                        selected={tabValue}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              <GoToBoundaryDropdown />
            </div>
          </div>
          <div className={classes.rightSideContainer}>
            <Legends />
            <RightSideMenu />
          </div>
        </div>
      </Toolbar>
    </AppBar>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    appBar: {
      backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      height: '6vh',
      display: 'flex',
      justifyContent: 'center',
    },
    panelButton: {
      height: '2.5em',
    },
    navbarContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      width: '100%',
    },
    leftSideContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '5rem',
      [theme.breakpoints.down('sm')]: {
        gap: '1rem',
      },
    },
    panelsContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '1rem',
      alignItems: 'center',
      [theme.breakpoints.down('sm')]: {
        gap: '0.5rem',
      },
    },
    rightSideContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '0.5rem',
      alignItems: 'center',
    },
    touchTargetSize: {
      touchTargetSize: isMobile => (isMobile ? '44px' : 'auto'),
    },
  }),
);

export default NavBar;
