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
} from '@material-ui/core';
import React, { useState } from 'react';
import { get } from 'lodash';
import { useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import About from './About';
import LanguageSelector from './LanguageSelector';
import PrintImage from './PrintImage';

function NavBar({ classes }: NavBarProps) {
  const { t } = useSafeTranslation();

  const rightSideLinks = [
    {
      title: 'GitHub',
      icon: faGithub,
      href: 'https://github.com/wfp-VAM/prism-app',
    },
  ];

  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const buttons = rightSideLinks.map(({ title, icon, href }) => (
    <Grid item key={title}>
      <Typography
        variant="body2"
        component="a"
        target="_blank"
        href={href}
        onClick={() => setOpenMobileMenu(false)}
      >
        <FontAwesomeIcon icon={icon} /> {title}
      </Typography>
    </Grid>
  ));

  const { title, subtitle, logo } = get(appConfig, 'header', {
    title: 'PRISM',
  });

  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar variant="dense">
        <Grid container>
          <Grid item xs={6} md={3} className={classes.logoContainer}>
            {logo && <img className={classes.logo} src={logo} alt="logo" />}
            <Box display="flex" flexDirection="column">
              {title && (
                <Typography variant="h6" className={classes.title}>
                  {t(title)}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="subtitle2" className={classes.subtitle}>
                  {t(subtitle)}
                </Typography>
              )}
            </Box>
          </Grid>

          <Hidden smDown>
            <Grid
              spacing={3}
              container
              justifyContent="flex-end"
              alignItems="center"
              item
              xs={6}
              md={9}
            >
              <PrintImage />
              {buttons}
              <About />
              <LanguageSelector />
            </Grid>
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
        </Grid>
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

    logoContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
  });

export interface NavBarProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(NavBar);
