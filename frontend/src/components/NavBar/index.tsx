import {
  AppBar,
  createStyles,
  makeStyles,
  Theme,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import {
  AddOutlined,
  BarChartOutlined,
  ImageAspectRatioOutlined,
  LayersOutlined,
  Notifications,
  PublishOutlined,
  SpeedOutlined,
  TableChartOutlined,
  TimerOutlined,
} from '@material-ui/icons';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import {
  areTablesAvailable,
  isAnticipatoryActionDroughtAvailable,
  isAnticipatoryActionFloodAvailable,
  isAnticipatoryActionStormAvailable,
} from 'components/MapView/LeftPanel/utils';
import Legends from 'components/MapView/Legends';
import { appConfig } from 'config';
import { Panel, PanelItem } from 'config/types';
import { areChartLayersAvailable } from 'config/utils';
import { dashboardsListSelector } from 'context/dashboardStateSlice';
import {
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import { useCountryIso } from 'context/useCountryIso';
import { useSafeTranslation } from 'i18n';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { generateSlugFromTitle } from 'utils/string-utils';
import {
  getUniversalDashboardPath,
  getUniversalMapPath,
} from 'utils/universal-routing';
import { isUniversalDeployment } from 'utils/universal-utils';

import PanelButton from './PanelButton';
import PanelMenu from './PanelMenu';
import RightSideMenu from './RightSideMenu';
import Title from './Title';

const { alertFormActive } = appConfig;

function NavBar() {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const classes = useStyles();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const dashboards = useSelector(dashboardsListSelector);
  const hasDashboards = dashboards.length > 0;
  const isDashboardMode = tabValue === Panel.Dashboard;
  const isUniversal = isUniversalDeployment();
  const { iso3 } = useCountryIso();
  const mapPath = isUniversal ? getUniversalMapPath(iso3) : '/';
  const dashboardBasePath = isUniversal
    ? getUniversalDashboardPath(iso3)
    : '/dashboard';

  const dashboardChildren: PanelItem[] = [
    ...dashboards.map((dashboard, index) => ({
      panel: Panel.Dashboard,
      label: dashboard.title,
      icon: <SpeedOutlined />,
      reportIndex: index,
      reportPath: dashboard.path || generateSlugFromTitle(dashboard.title),
      isDraft: dashboard.isDraft,
    })),
    {
      panel: Panel.Dashboard,
      label: 'Import JSON',
      icon: <PublishOutlined />,
      reportPath: 'import',
      dividerBefore: true,
    },
    {
      panel: Panel.Dashboard,
      label: 'Create dashboard',
      icon: <AddOutlined />,
      reportPath: 'create',
    },
  ];

  const panels: PanelItem[] = [
    { panel: Panel.Layers, label: 'Layers', icon: <LayersOutlined /> },
    ...(areChartLayersAvailable
      ? [{ panel: Panel.Charts, label: 'Charts', icon: <BarChartOutlined /> }]
      : []),
    ...(hasDashboards
      ? [
          {
            panel: Panel.Dashboard,
            label: 'Dashboard',
            icon: <SpeedOutlined />,
            children: dashboardChildren,
          },
        ]
      : []),
    {
      panel: Panel.Analysis,
      label: 'Analysis',
      icon: <ImageAspectRatioOutlined />,
    },
    ...(areTablesAvailable
      ? [
          {
            panel: Panel.Tables,
            label: 'Tables',
            icon: <TableChartOutlined />,
          },
        ]
      : []),
    ...(isAnticipatoryActionDroughtAvailable ||
    isAnticipatoryActionStormAvailable ||
    isAnticipatoryActionFloodAvailable
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
              ...(isAnticipatoryActionFloodAvailable
                ? [
                    {
                      panel: Panel.AnticipatoryActionFlood,
                      label: 'A. Action Flood',
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
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [selectedChild, setSelectedChild] = useState<Record<string, PanelItem>>(
    {},
  );

  // Sync URL with panel state
  useEffect(() => {
    const onDashboardPath = location.pathname.includes('/dashboard');

    if (onDashboardPath && tabValue !== Panel.Dashboard) {
      dispatch(setTabValue(Panel.Dashboard));
    } else if (location.pathname === mapPath && tabValue === Panel.Dashboard) {
      dispatch(setTabValue(Panel.Layers));
    }
  }, [location.pathname, tabValue, dispatch, mapPath]);

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
    if (panel === Panel.Dashboard) {
      history.push(dashboardBasePath);
    } else if (location.pathname !== mapPath) {
      history.push(mapPath);
    }
  };

  const handleChildSelection = (panel: any, child: any) => {
    setSelectedChild({
      [panel.label]: child,
    });
    handleMenuClose(panel.label);

    if (panel.panel === Panel.Dashboard && child.reportPath) {
      dispatch(setTabValue(Panel.Dashboard));
      history.push(
        isUniversal
          ? getUniversalDashboardPath(iso3, child.reportPath)
          : `/dashboard/${child.reportPath}`,
      );
    } else {
      handlePanelClick(child.panel);
    }
  };

  return (
    <AppBar position="fixed" className={classes.appBar}>
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

                const buttonText =
                  selectedChild[panel.label] && panel.panel !== Panel.Dashboard
                    ? selectedChild[panel.label].label
                    : t(panel.label);

                return (
                  <React.Fragment key={panel.label}>
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
            {!isDashboardMode && <Legends />}
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
      height: '56px',
      minHeight: '56px',
      maxHeight: '56px',
      display: 'flex',
      justifyContent: 'center',
      top: 0,
      zIndex: theme.zIndex.drawer + 1,
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
  }),
);

export default NavBar;
