import React, { useState } from 'react';
import {
  IconButton,
  makeStyles,
  useTheme,
  useMediaQuery,
  Drawer,
  createStyles,
  Theme,
} from '@material-ui/core';
import {
  Menu,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
} from '@material-ui/icons';
import { appConfig } from 'config';
import About from '../About';
import LanguageSelector from '../LanguageSelector';
import PrintImage from '../PrintImage';

type ConfigRightSideLink = {
  title: string;
  href: string;
  icon?: string;
};

type RightSideLink = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

type IconComponent = typeof GitHubIcon;

const rightSideIconMap: Record<string, IconComponent> = {
  github: GitHubIcon,
  external: OpenInNewIcon,
};

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

  const defaultRightSideLinks = [
    {
      title: 'GitHub',
      icon: <GitHubIcon style={{ fontSize: mdUp ? '1.25rem' : '1.5rem' }} />,
      href: 'https://github.com/wfp-VAM/prism-app',
    },
  ];

  const configuredRightSideLinks: RightSideLink[] = Array.isArray(
    (appConfig as Record<string, any>).rightSideLinks,
  )
    ? (appConfig.rightSideLinks as ConfigRightSideLink[])
        .filter(link => link?.title && link?.href)
        .map(link => {
          const iconKey = (link.icon || '').toLowerCase();
          const IconComp =
            rightSideIconMap[iconKey] || rightSideIconMap.external;
          const iconNode = (
            <IconComp
              style={{
                fontSize: mdUp ? '1.25rem' : '1.5rem',
              }}
            />
          );
          return {
            title: link.title,
            href: link.href,
            icon: iconNode,
          };
        })
    : [];

  const buttons = [...defaultRightSideLinks, ...configuredRightSideLinks].map(
    ({ title, icon, href }) => (
      <IconButton
        key={title}
        component="a"
        target="_blank"
        href={href}
        style={{ color: 'white' }}
        aria-label={title}
      >
        {icon}
      </IconButton>
    ),
  );

  return (
    <>
      {!smDown ? (
        <RightSideMenuContent buttons={buttons} />
      ) : (
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          style={{ color: 'white' }}
          aria-label="Open menu"
        >
          <Menu />
        </IconButton>
      )}
      {mobileMenuOpen && (
        <Drawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        >
          <div className={classes.mobileDrawerContent}>
            <RightSideMenuContent buttons={buttons} />
          </div>
        </Drawer>
      )}
    </>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    mobileDrawerContent: {
      backgroundColor: theme.palette.primary.main,
      width: '80px',
      height: '100vh',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: '0.5rem',
    },
  }),
);

export default RightSideMenu;
