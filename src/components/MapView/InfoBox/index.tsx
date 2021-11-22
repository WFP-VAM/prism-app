import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  Collapse,
  colors,
  createStyles,
  Divider,
  Grid,
  Hidden,
  IconButton,
  Theme,
  Typography,
  WithStyles,
  withStyles,
  Button,
} from '@material-ui/core';
import {
  ExpandMore,
  Group,
  Visibility,
  VisibilityOff,
} from '@material-ui/icons';
import clsx from 'clsx';
import numeral from 'numeral';
import { ITEMS } from './utils';

function InfoBox({ classes }: InfoBoxProps) {
  const [open, setOpen] = useState(false);
  const [expandItem, setExpandItem] = useState(true);
  const [expandChart, setExpandChart] = useState(true);

  const handleExpandItemClick = () => {
    setExpandItem(!expandItem);
  };
  const handleExpandChartClick = () => {
    setExpandChart(!expandChart);
  };

  return (
    <Grid item>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <VisibilityOff fontSize="small" />
        ) : (
          <Visibility fontSize="small" />
        )}
        <Hidden smDown>
          <Typography className={classes.label} variant="body2">
            Info
          </Typography>
        </Hidden>
      </Button>
      {open && (
        <Card className={classes.card}>
          <CardContent className={classes.cardHeader}>
            <Typography component="h4" variant="h4">
              Socio-Economic Condition
            </Typography>
            <Typography component="h5" variant="h5">
              Kab. Sumba Timur
            </Typography>
          </CardContent>
          <Divider />
          <CardActions disableSpacing>
            <Typography variant="h4">Populasi berpotensi terdampak</Typography>
            <IconButton
              className={clsx(classes.expand, {
                [classes.expandOpen]: expandItem,
              })}
              onClick={handleExpandItemClick}
              aria-expanded={expandItem}
              aria-label="show more"
            >
              <ExpandMore />
            </IconButton>
          </CardActions>
          <Collapse in={expandItem} timeout="auto" unmountOnExit>
            <CardContent className={classes.noPadding}>
              <Box display="flex" flexWrap="wrap">
                {ITEMS.map(item => {
                  return (
                    <Box
                      key={item.label}
                      display="flex"
                      alignItems="center"
                      className={classes.item}
                    >
                      <Box className={classes.itemAvatar}>
                        <Avatar className={classes.blueGrey}>
                          <Group />
                        </Avatar>
                      </Box>
                      <Box>
                        <Typography
                          className={classes.itemTitle}
                          color="textSecondary"
                        >
                          {numeral(item.amount).format('0,0')}
                        </Typography>
                        <Typography
                          className={classes.itemSubtitle}
                          color="textSecondary"
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Collapse>

          <CardActions disableSpacing>
            <Typography variant="h4">Profil Kerentanan</Typography>
            <IconButton
              className={clsx(classes.expand, {
                [classes.expandOpen]: expandChart,
              })}
              onClick={handleExpandChartClick}
              aria-expanded={expandChart}
              aria-label="show more"
            >
              <ExpandMore />
            </IconButton>
          </CardActions>
          <Collapse in={expandChart} timeout="auto" unmountOnExit>
            <CardContent className={classes.noPadding}>
              fill with chart later
            </CardContent>
          </Collapse>
        </Card>
      )}
    </Grid>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    label: {
      marginLeft: '10px',
    },

    card: {
      overflow: 'auto',
      maxHeight: '70vh',
      maxWidth: 350,
      position: 'absolute',
      left: 16,
      marginTop: 12,
    },

    cardHeader: {
      padding: 8,
    },

    item: {
      padding: '5px 8px',
      width: 150,
    },

    itemAvatar: {
      paddingRight: 8,
    },

    itemTitle: {
      fontSize: 14,
      fontWeight: 'bold',
    },

    itemSubtitle: {
      fontSize: 10,
    },

    blueGrey: {
      color: theme.palette.getContrastText(colors.blueGrey[500]),
      backgroundColor: colors.blueGrey[500],
    },

    expand: {
      padding: 8,
      transform: 'rotate(0deg)',
      marginLeft: 'auto',
      transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest,
      }),
    },

    expandOpen: {
      transform: 'rotate(180deg)',
    },

    noPadding: {
      padding: 0,
    },
  });

export interface InfoBoxProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(InfoBox);
