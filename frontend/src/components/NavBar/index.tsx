/* eslint-disable react/prop-types */
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AppBar,
  Button,
  Box,
  createStyles,
  Theme,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  makeStyles,
  useTheme,
  useMediaQuery,
} from '@material-ui/core';
import React from 'react';
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
  Panel,
  leftPanelTabValueSelector,
  setTabValue,
} from 'context/leftPanelStateSlice';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import useLayers from 'utils/layers-utils';
import Legends from 'components/MapView/Legends';
import { black, cyanBlue } from 'muiTheme';
import { analysisResultSelector } from 'context/analysisResultStateSlice';
import { areChartLayersAvailable } from 'config/utils';
import {
  areTablesAvailable,
  isAnticipatoryActionAvailable,
} from 'components/MapView/LeftPanel/utils';
import About from './About';
import LanguageSelector from './LanguageSelector';
import PrintImage from './PrintImage';

const { alertFormActive, header } = appConfig;

const panels = [
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
  ...(isAnticipatoryActionAvailable
    ? [
        {
          panel: Panel.AnticipatoryAction,
          label: 'A. Action',
          icon: <TimerOutlined />,
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
  const analysisData = useSelector(analysisResultSelector);
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const { numberOfActiveLayers } = useLayers();

  const badgeContent = numberOfActiveLayers + Number(Boolean(analysisData));

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
      <FontAwesomeIcon fontSize="20px" icon={icon} />
    </IconButton>
  ));

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
                const Wrap =
                  badgeContent >= 1 && panel.panel === Panel.Layers
                    ? // eslint-disable-next-line react/no-unused-prop-types
                      ({ children }: { children: React.ReactNode }) => (
                        <Badge
                          anchorOrigin={{
                            horizontal: 'left',
                            vertical: 'top',
                          }}
                          overlap="rectangular"
                          badgeContent={badgeContent}
                          color="secondary"
                        >
                          {children}
                        </Badge>
                      )
                    : ({ children }: { children: React.ReactNode }) => children;

                return (
                  <React.Fragment key={panel.panel}>
                    {!smDown && (
                      <Button
                        className={classes.panelButton}
                        style={{
                          backgroundColor:
                            tabValue === panel.panel ? cyanBlue : undefined,
                          color: tabValue === panel.panel ? black : undefined,
                        }}
                        startIcon={<Wrap>{panel.icon}</Wrap>}
                        onClick={() => {
                          dispatch(setTabValue(panel.panel));
                        }}
                      >
                        <Typography
                          style={{
                            color: tabValue === panel.panel ? black : '#FFFF',
                            textTransform: 'none',
                          }}
                        >
                          {t(panel.label)}
                        </Typography>
                      </Button>
                    )}
                    {!mdUp && (
                      <Wrap>
                        <IconButton
                          style={{
                            backgroundColor:
                              tabValue === panel.panel ? cyanBlue : undefined,
                            color: tabValue === panel.panel ? black : 'white',
                          }}
                          onClick={() => {
                            dispatch(setTabValue(panel.panel));
                          }}
                        >
                          {panel.icon}
                        </IconButton>
                      </Wrap>
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
