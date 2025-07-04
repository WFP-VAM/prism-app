import React, { useState } from 'react';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  IconButton,
  makeStyles,
  useTheme,
  useMediaQuery,
  Drawer,
  createStyles,
  Theme,
} from '@material-ui/core';
import { Menu } from '@material-ui/icons';
import About from '../About';
import LanguageSelector from '../LanguageSelector';
import PrintImage from '../PrintImage';

const rightSideLinks = [
  {
    title: 'GitHub',
    icon: faGithub,
    href: 'https://github.com/wfp-VAM/prism-app',
  },
];

function RightSideMenuContent({ buttons }: { buttons: React.ReactNode }) {
  return (
    <>
      <PrintImage />
      {buttons}
      <About />
      <LanguageSelector />
    </>
  );
}

function RightSideMenu() {
  const classes = useStyles();
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <>
      {!smDown ? (
        <RightSideMenuContent buttons={buttons} />
      ) : (
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          style={{ color: 'white' }}
        >
          <Menu />
        </IconButton>
      )}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className={classes.mobileDrawer}
      >
        <div className={classes.mobileDrawerContent}>
          <RightSideMenuContent buttons={buttons} />
        </div>
      </Drawer>
    </>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
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
    mobileDrawer: {
      width: '80vw',
    },
  }),
);

export default RightSideMenu;
