import React from 'react';
import { Link } from '@reach/router';
import {
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Theme,
  withStyles,
  WithStyles,
  createStyles,
} from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import MenuItem from './MenuItem/MenuItem';
import { categories } from './utils';

function NavBar({ classes }: NavBarProps) {
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
              Prism
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
                <FontAwesomeIcon icon={faInfoCircle} /> About
              </Typography>
            </Grid>

            <Grid item>
              <Typography variant="body2" component={Link} to="/">
                <FontAwesomeIcon icon={faGithub} /> Github
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Toolbar>
    </AppBar>
  );
}

const styles = (theme: Theme) =>
  createStyles({
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
      textTransform: 'uppercase',
      padding: 0,
    },

    menuContainer: {
      textAlign: 'center',
    },

    aboutSectionContainer: {},
  });

export interface NavBarProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(NavBar);
