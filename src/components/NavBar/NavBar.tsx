import React from 'react';
import { Link } from '@reach/router';
import {
  AppBar,
  Toolbar,
  Typography,
  withStyles,
  Grid,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import MenuItem from './MenuItem/MenuItem';
import { categories } from './utils';

export interface INavBarProps {
  classes: { [key: string]: string };
}

function NavBar({ classes }: INavBarProps) {
  return (
    <AppBar position="static" className={classes.appBar}>
      <Toolbar variant="dense">
        <Grid container>
          <Grid item xs={3} className={classes.logoContainer}>
            <Typography
              variant="h6"
              className={classes.logo}
              component={Link}
              to="/"
            >
              VAMPIRE
            </Typography>
          </Grid>

          <Grid className={classes.menuContainer} item xs={6}>
            {categories.map(({ title, icon, layersList }) => (
              <MenuItem
                key={title}
                title={title}
                icon={icon}
                layersList={layersList}
              />
            ))}
          </Grid>

          <Grid
            className={classes.aboutSectionContainer}
            spacing={3}
            container
            justify="flex-end"
            alignItems="center"
            item
            xs={3}
          >
            <Grid item>
              <Typography variant="body2" component={Link} to="/">
                <FontAwesomeIcon icon={faInfoCircle} /> ABOUT
              </Typography>
            </Grid>

            <Grid item>
              <Typography variant="body2" component={Link} to="/">
                <FontAwesomeIcon icon={faGithub} /> GITHUB
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

const styles: any = (theme: any) => ({
  appBar: {
    backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  },

  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    letterSpacing: '.3rem',
    fontSize: '1.25rem',
    padding: 0,
  },

  menuContainer: {
    textAlign: 'center',
  },

  aboutSectionContainer: {},
});

export default withStyles(styles)(NavBar);
