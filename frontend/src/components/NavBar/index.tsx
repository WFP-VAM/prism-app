/* eslint-disable react/prop-types */
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AppBar,
  Box,
  createStyles,
  Theme,
  Toolbar,
  Typography,
  IconButton,
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
import About from './About';
import LanguageSelector from './LanguageSelector';
import PrintImage from './PrintImage';
import PanelMenu from './PanelMenu';
import PanelButton from './PanelButton';

const { alertFormActive, header } = appConfig;

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
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [selectedChild, setSelectedChild] = useState<Record<string, PanelItem>>(
    {},
  );

  const rightSideLinks = [
    {
      title: 'GitHub',
      icon: faGithub,
      href: 'https://github.com/wfp-VAM/prism-app',
    },
  ];

  const buttons = rightSideLinks.map(({ title, icon, href }) => (
    <IconButton
      key={title}
      component="a"
      target="_blank"
      href={href}
      style={{ color: 'white' }}
    >
      <FontAwesomeIcon fontSize={mdUp ? '1.25rem' : '1.5rem'} icon={icon} />
    </IconButton>
  ));

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

  const { title, subtitle, logo } = header || {
    title: 'PRISM',
  };

  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar variant="dense">
        <div className={classes.navbarContainer}>
          <div className={classes.leftSideContainer}>
            <div className={classes.titleContainer}>
              {logo && <img className={classes.logo} src={logo} alt="logo" />}
              <Box
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {title && (
                  <Typography
                    color="secondary"
                    variant="h6"
                    className={classes.title}
                  >
                    {t(title)}
                  </Typography>
                )}
                {subtitle && !smDown && (
                  <Typography
                    color="secondary"
                    variant="subtitle2"
                    className={classes.subtitle}
                  >
                    {t(subtitle)}
                  </Typography>
                )}
              </Box>
            </div>
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
            <PrintImage />
            {buttons}
            <About />
            <LanguageSelector />
          </div>
        </div>
      </Toolbar>
    </AppBar>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    logo: {
      height: 32,
      marginRight: 15,
    },
    appBar: {
      backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      height: '6vh',
      display: 'flex',
      justifyContent: 'center',
    },
    panelButton: {
      height: '2.5em',
    },
    title: {
      letterSpacing: '.3rem',
      fontSize: '1.25rem',
      lineHeight: '1.5rem',
      textTransform: 'uppercase',
      padding: 0,
    },
    subtitle: {
      fontSize: '.8rem',
      fontWeight: 300,
      letterSpacing: '.1rem',
      lineHeight: '.8rem',
      padding: 0,
    },
    menuContainer: {
      textAlign: 'center',
    },
    mobileDrawerContent: {
      backgroundColor: theme.palette.primary.main,
      paddingTop: 16,
      width: '80vw',
      height: '100vh',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      paddingLeft: '1em',
    },
    menuBars: {
      height: '100%',
      fontSize: 20,
      color: theme.palette.text.primary,
    },
    mobileMenuContainer: {
      textAlign: 'right',
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
    },
    titleContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '1rem',
      alignItems: 'center',
    },
    panelsContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '1rem',
      alignItems: 'center',
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
