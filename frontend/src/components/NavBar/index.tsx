/* eslint-disable @typescript-eslint/no-unused-vars */
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AppBar,
  Button,
  Box,
  createStyles,
  Drawer,
  Grid,
  Hidden,
  Theme,
  Toolbar,
  Typography,
  withStyles,
  WithStyles,
  IconButton,
} from '@material-ui/core';
import React, { useState } from 'react';
import { useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import {
  BarChartOutlined,
  ImageAspectRatioOutlined,
  LayersOutlined,
} from '@material-ui/icons';
import { useDispatch } from 'react-redux';
import { Panel, setTabValue } from 'context/leftPanelStateSlice';
import GoToBoundaryDropdown from 'components/Common/BoundaryDropdown/goto';
import AlertForm from 'components/MapView/AlertForm';
import useLayers from 'utils/layers-utils';
import Legends from 'components/MapView/Legends';
import About from './About';
import LanguageSelector from './LanguageSelector';
import PrintImage from './PrintImage';

function NavBar({ classes, isAlertFormOpen, setIsAlertFormOpen }: NavBarProps) {
  const { t } = useSafeTranslation();
  const dispatch = useDispatch();
  const { alertFormActive, header } = appConfig;
  const { selectedLayers, adminBoundariesExtent } = useLayers();

  const rightSideLinks = [
    {
      title: 'GitHub',
      icon: faGithub,
      href: 'https://github.com/wfp-VAM/prism-app',
    },
  ];

  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const buttons = rightSideLinks.map(({ title, icon, href }) => (
    <IconButton
      key={title}
      component="a"
      target="_blank"
      href={href}
      onClick={() => setOpenMobileMenu(false)}
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
        <Hidden smDown>
          <div className={classes.navbarContainer}>
            <div className={classes.leftSideContainer}>
              <div className={classes.titleContainer}>
                {logo && <img className={classes.logo} src={logo} alt="logo" />}
                <Box display="flex" flexDirection="column">
                  {title && (
                    <Typography variant="h6" className={classes.title}>
                      {t(title)}
                    </Typography>
                  )}
                  {subtitle && (
                    <Typography
                      variant="subtitle2"
                      className={classes.subtitle}
                    >
                      {t(subtitle)}
                    </Typography>
                  )}
                </Box>
              </div>
              <div className={classes.panelsContainer}>
                <Button
                  startIcon={<LayersOutlined />}
                  onClick={() => dispatch(setTabValue(Panel.Layers))}
                >
                  {t('Layers')}
                </Button>
                <Button
                  startIcon={<BarChartOutlined />}
                  onClick={() => dispatch(setTabValue(Panel.Charts))}
                >
                  {t('Charts')}
                </Button>
                <Button
                  startIcon={<ImageAspectRatioOutlined />}
                  onClick={() => dispatch(setTabValue(Panel.Analysis))}
                >
                  {t('Analysis')}
                </Button>
                <GoToBoundaryDropdown />
                {alertFormActive && (
                  <AlertForm
                    isOpen={isAlertFormOpen}
                    setOpen={setIsAlertFormOpen}
                  />
                )}
              </div>
            </div>
            <div className={classes.rightSideContainer}>
              <Legends layers={selectedLayers} extent={adminBoundariesExtent} />
              <PrintImage />
              {buttons}
              <About />
              <LanguageSelector />
            </div>
          </div>
        </Hidden>

        <Hidden mdUp>
          <Grid item xs={6} className={classes.mobileMenuContainer}>
            <Button
              onClick={() => setOpenMobileMenu(prevOpen => !prevOpen)}
              aria-controls={openMobileMenu ? 'mobile-menu-list' : undefined}
              aria-haspopup="true"
              className={classes.menuBars}
            >
              <FontAwesomeIcon icon={faBars} />
            </Button>

            <Drawer
              anchor="right"
              open={openMobileMenu}
              onClose={() => setOpenMobileMenu(false)}
            >
              <Grid
                container
                spacing={3}
                className={classes.mobileDrawerContent}
              >
                <PrintImage />
                {buttons}
                <About />
                <LanguageSelector />
              </Grid>
            </Drawer>
          </Grid>
        </Hidden>
      </Toolbar>
    </AppBar>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    logo: {
      height: 32,
      marginRight: 15,
    },
    appBar: {
      backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      height: '7vh',
      display: 'flex',
      justifyContent: 'center',
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
    },
    rightSideContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'start',
      gap: '0.5rem',
      alignItems: 'center',
    },
  });

export interface NavBarProps extends WithStyles<typeof styles> {
  isAlertFormOpen: boolean;
  setIsAlertFormOpen: (v: boolean) => void;
}

export default withStyles(styles)(NavBar);
