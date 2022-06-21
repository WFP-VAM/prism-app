import React, { useEffect, useState } from 'react';
import { Feature } from 'geojson';
import { useDispatch, useSelector } from 'react-redux';
import { sortBy } from 'lodash';
import {
  createStyles,
  Dialog,
  DialogTitle,
  Theme,
  WithStyles,
  withStyles,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Box,
} from '@material-ui/core';
import { multiPolygon } from '@turf/helpers';
import bbox from '@turf/bbox';
import {
  LayerType,
  BoundaryLayerProps,
  KoboAuthParams,
} from '../../config/types';
import { getBoundaryLayers } from '../../config/utils';
import { useSafeTranslation } from '../../i18n';
import {
  layersSelector,
  layerDataSelector,
} from '../../context/mapStateSlice/selectors';

import { setLayerAccessToken } from '../../context/serverStateSlice';
import { LayerData } from '../../context/layers/layer-data';

const AuthModal = ({ classes }: AuthModalProps) => {
  const [layerWithAuth, setLayers] = useState<LayerType>();
  const [open, setOpen] = useState(true);
  const [authParams, setAuthParams] = useState<KoboAuthParams>({
    adminCode: '',
    token: '',
    bbox: '',
  });
  const selectedLayers = useSelector(layersSelector);
  const dispatch = useDispatch();

  // Get the admin boundary layer, with lowest number of level names (provinces).

  const boundaryLayer = getBoundaryLayers().reduce((boundary, item) =>
    boundary.adminLevelNames.length > item.adminLevelNames.length
      ? item
      : boundary,
  );

  const boundaryData = useSelector(layerDataSelector(boundaryLayer.id)) as
    | LayerData<BoundaryLayerProps>
    | undefined;

  const { t } = useSafeTranslation();

  useEffect(() => {
    const layersWithAuthRequired = selectedLayers.find(
      layer => layer.type === 'point_data' && layer.tokenRequired,
    );
    setLayers(layersWithAuthRequired);
  }, [selectedLayers]);

  if (!layerWithAuth || !boundaryData) {
    return null;
  }

  const boundaries = boundaryData.data.features.map((feature: Feature) => {
    const { geometry, properties } = feature;

    if (!properties || geometry.type !== 'MultiPolygon') {
      return undefined;
    }

    const turfObj = multiPolygon(geometry.coordinates);
    const geomBbox = bbox(turfObj);

    return {
      bbox: geomBbox.join(','),
      adminName: properties[boundaryLayer.adminLevelNames[0]],
      adminCode: properties[boundaryLayer.adminCode],
    };
  });

  const sortedBoundaries = sortBy(boundaries, 'adminName');

  const validateToken = () => {
    dispatch(setLayerAccessToken(authParams));
    setOpen(false);
  };

  return (
    <Dialog
      maxWidth="xl"
      open={open}
      keepMounted
      onClose={() => setOpen(false)}
      aria-labelledby="dialog-preview"
    >
      <div className={classes.modal}>
        <DialogTitle className={classes.title} id="dialog-preview">
          {t('Authentication required')}
        </DialogTitle>

        <Typography color="textSecondary" variant="h4">
          {t('The following layer  requires an access token')}:{' '}
          {layerWithAuth.title}
        </Typography>

        <Box width="70%" display="flex" justifyContent="space-between">
          <Select value={authParams.bbox} className={classes.select}>
            {sortedBoundaries.map(boundary =>
              boundary ? (
                <MenuItem
                  title={boundary.adminName}
                  value={boundary.bbox}
                  onClick={() =>
                    setAuthParams(params => ({ ...params, ...boundary }))
                  }
                >
                  {boundary.adminName}
                </MenuItem>
              ) : null,
            )}
          </Select>

          <TextField
            id="accesstoken"
            placeholder="Access Token"
            value={authParams.token}
            className={classes.textField}
            onChange={e => {
              const { value } = e.target;
              setAuthParams(params => ({
                ...params,
                token: value,
              }));
            }}
          />
        </Box>
        <div className={classes.container}>
          <div className={classes.buttonWrapper}>
            <Button variant="contained" color="primary" onClick={validateToken}>
              {t('Accept')}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setOpen(false)}
            >
              {t('Cancel')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

const styles = (theme: Theme) =>
  createStyles({
    modal: {
      width: '40vw',
      height: '26vh',
      color: theme.palette.text.secondary,
      padding: '1em 0.75em',
    },
    title: {
      color: theme.palette.text.secondary,
      marginBottom: '1.5em',
      padding: 0,
    },
    textField: {
      marginTop: '1em',
      '& .MuiInputBase-input': { color: theme.palette.text.secondary },
    },
    select: {
      width: '50%',
      '& .MuiInputBase-input': { color: theme.palette.text.secondary },
    },
    container: {
      display: 'flex',
      justifyContent: 'flex-end',
    },
    buttonWrapper: {
      marginTop: '1em',
      display: 'flex',
      width: '33%',
      justifyContent: 'space-between',
    },
  });

export interface AuthModalProps extends WithStyles<typeof styles> {}

export default withStyles(styles)(AuthModal);
