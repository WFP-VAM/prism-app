import React from 'react';
import {
  Button,
  createStyles,
  Theme,
  Typography,
  withStyles,
  WithStyles,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  FormControlLabel,
} from '@material-ui/core';
import { Assessment, ArrowDropDown } from '@material-ui/icons';

function Analyser({ classes }: AnalyserProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={classes.analyser}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(!open)}
        style={{ display: open ? 'none' : 'inline-flex' }}
      >
        <Assessment style={{ marginRight: '10px' }} />
        <Typography variant="body2">Run Analysis</Typography>
        <ArrowDropDown />
      </Button>

      <Button
        variant="contained"
        color="primary"
        className={classes.analyserButton}
      >
        <Typography variant="body2">Show Result</Typography>
      </Button>
      <Button
        variant="contained"
        color="primary"
        className={classes.analyserButton}
      >
        <Typography variant="body2">Download</Typography>
      </Button>

      <div
        className={classes.analyserMenu}
        style={{ width: open ? '40vw' : 0, padding: open ? 10 : 0 }}
      >
        <FormControl component="fieldset">
          <RadioGroup>
            <FormControlLabel
              value="new"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Create a new analysis"
            />
            <FormControlLabel
              value="pre-configure"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Run a pre-configured analysis"
            />
            <FormControlLabel
              value="generate"
              control={
                <Radio className={classes.analyserOptions} size="small" />
              }
              label="Generate spatial statistics"
            />
          </RadioGroup>
        </FormControl>
        <div className={classes.newAnalyserContainer}>
          <div>
            <Typography>Step 1 - Choose a hazard Layer</Typography>
            <div>
              <FormControl component="div">
                <FormLabel component="legend">Drought Indication</FormLabel>
                <RadioGroup>
                  <FormControlLabel
                    value="new"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Pasture Anomaly"
                  />
                  <FormControlLabel
                    value="pre-configure"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Vegetation Index (NDVI)"
                  />
                  <FormControlLabel
                    value="generate"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Agricultural Drought (VHI)"
                  />
                </RadioGroup>
              </FormControl>
            </div>
            <div>
              <FormControl component="div">
                <FormLabel component="legend">Drought Indication</FormLabel>
                <RadioGroup>
                  <FormControlLabel
                    value="new"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Pasture Anomaly"
                  />
                  <FormControlLabel
                    value="pre-configure"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Vegetation Index (NDVI)"
                  />
                  <FormControlLabel
                    value="generate"
                    control={
                      <Radio className={classes.radioOptions} size="small" />
                    }
                    label="Agricultural Drought (VHI)"
                  />
                </RadioGroup>
              </FormControl>
            </div>
          </div>
          <div>
            <Typography>Step 1 - Choose a hazard Layer</Typography>
            <FormControl component="div">
              <FormLabel component="legend">Drought Indication</FormLabel>
              <RadioGroup>
                <FormControlLabel
                  value="new"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Pasture Anomaly"
                />
                <FormControlLabel
                  value="pre-configure"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Vegetation Index (NDVI)"
                />
                <FormControlLabel
                  value="generate"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Agricultural Drought (VHI)"
                />
              </RadioGroup>
            </FormControl>
          </div>
          <div>
            <Typography>Step 1 - Choose a hazard Layer</Typography>
            <FormControl component="div">
              <FormLabel component="legend">Drought Indication</FormLabel>
              <RadioGroup>
                <FormControlLabel
                  value="new"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Pasture Anomaly"
                />
                <FormControlLabel
                  value="pre-configure"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Vegetation Index (NDVI)"
                />
                <FormControlLabel
                  value="generate"
                  control={
                    <Radio className={classes.radioOptions} size="small" />
                  }
                  label="Agricultural Drought (VHI)"
                />
              </RadioGroup>
            </FormControl>
          </div>
        </div>
        <Button>
          <Typography variant="body2">Run Analysis</Typography>
        </Button>
        <Button>
          <Typography variant="body2">Show Result</Typography>
        </Button>
        <Button>
          <Typography variant="body2">Download</Typography>
        </Button>
      </div>
    </div>
  );
}

const styles = (theme: Theme) =>
  createStyles({
    analyser: {
      zIndex: theme.zIndex.drawer,
      position: 'absolute',
      top: 2,
      left: 2,
      textAlign: 'left',
    },
    analyserMenu: {
      backgroundColor: '#5A686C',
      maxWidth: '100vw',
      color: 'white',
      overflowX: 'hidden',
      // transition: 'width 0.5s ease-in-out',
      whiteSpace: 'nowrap',
      borderTopRightRadius: '10px',
      borderBottomRightRadius: '10px',
      height: '600px',
      maxHeight: '90vh',
    },
    analyserButton: {
      height: '36px',
      'margin-left': '3px',
    },
    analyserOptions: {
      color: 'white',
      padding: '2px 5px',
    },
    newAnalyserContainer: {
      padding: '5px',
    },
    radioOptions: {
      color: 'white',
      paddingTop: '2px',
      paddingBottom: '2px',
    },
  });

interface AnalyserProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(Analyser);
