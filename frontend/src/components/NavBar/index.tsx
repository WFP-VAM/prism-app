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
} from '@mui/icons-material';
import { AppBar, Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
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
import { useSafeTranslation } from 'i18n';
import { white } from 'muiTheme';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { generateSlugFromTitle } from 'utils/string-utils';

import PanelButton from './PanelButton';
import PanelMenu from './PanelMenu';
import RightSideMenu from './RightSideMenu';
import Title from './Title';

const { alertFormActive } = appConfig;

/** Nav chrome only — avoid styling fixed legend list descendants */
const toolbarSurfaceSx = {
  '& > .MuiButton-root': {
    color: white,
  },
  '& > .MuiIconButton-root': {
    color: white,
  },
  '& .MuiButton-startIcon, & .MuiButton-endIcon': {
    color: 'inherit',
  },
};

function NavBar() {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const tabValue = useSelector(leftPanelTabValueSelector);
  const dashboards = useSelector(dashboardsListSelector);
  const hasDashboards = dashboards.length > 0;
  const isDashboardMode = tabValue === Panel.Dashboard;

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
    if (
      location.pathname.startsWith('/dashboard') &&
      tabValue !== Panel.Dashboard
    ) {
      dispatch(setTabValue(Panel.Dashboard));
    } else if (location.pathname === '/' && tabValue === Panel.Dashboard) {
      dispatch(setTabValue(Panel.Layers));
    }
  }, [location.pathname, tabValue, dispatch]);

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
      history.push('/dashboard');
    } else if (location.pathname !== '/') {
      history.push('/');
    }
  };

  const handleChildSelection = (panel: any, child: any) => {
    setSelectedChild({
      [panel.label]: child,
    });
    handleMenuClose(panel.label);

    if (panel.panel === Panel.Dashboard && child.reportPath) {
      dispatch(setTabValue(Panel.Dashboard));
      history.push(`/dashboard/${child.reportPath}`);
    } else {
      handlePanelClick(child.panel);
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        height: '56px',
        minHeight: '56px',
        maxHeight: '56px',
        display: 'flex',
        justifyContent: 'center',
        top: 0,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            flexDirection: 'row',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'start',
              gap: '5rem',
              [theme.breakpoints.down('md')]: {
                gap: '1rem',
              },
            }}
          >
            <Title />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '1rem',
                alignItems: 'center',
                [theme.breakpoints.down('md')]: {
                  gap: '0.5rem',
                },
              }}
            >
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
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'start',
              gap: '0.5rem',
              alignItems: 'center',
              ...toolbarSurfaceSx,
            }}
          >
            {!isDashboardMode && <Legends />}
            <RightSideMenu />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default NavBar;
