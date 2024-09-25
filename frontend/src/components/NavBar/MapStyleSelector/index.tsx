import React from 'react';
import {
  Button,
  createStyles,
  makeStyles,
  Menu,
  MenuItem,
  Typography,
} from '@material-ui/core';
import { useSafeTranslation } from 'i18n';
import { appConfig } from 'config';
import { get } from 'lodash';
import { ArrowDropDown, Public } from '@material-ui/icons';
import { useDispatch, useSelector } from 'react-redux';
import { mapStyleSelector } from 'context/mapStateSlice/selectors';
import { MapStyle, setMapStyle } from 'context/mapStateSlice';

const mapStyles: MapStyle[] = get(appConfig.map, 'styles', []);

function MapStyleSelector() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { t } = useSafeTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const mapStyle = useSelector(mapStyleSelector);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (style: MapStyle): void => {
    dispatch(setMapStyle(style));
    handleClose();
  };

  if (mapStyles.length <= 1) {
    return null;
  }

  return (
    <>
      <Button
        aria-label="map-style-select-dropdown-button"
        style={{ paddingLeft: 0 }}
        onClick={handleClick}
        endIcon={<ArrowDropDown fontSize="small" />}
      >
        <Public style={{ paddingRight: '0.5rem' }} />
        <Typography color="secondary" style={{ textTransform: 'none' }}>
          {t(mapStyle?.label || '')}
        </Typography>
      </Button>
      <Menu
        open={Boolean(anchorEl)}
        onClose={handleClose}
        className={classes.block}
        anchorEl={anchorEl}
      >
        {mapStyles?.map(x => (
          <MenuItem key={x.id} onClick={() => handleChange(x)}>
            <Typography>{t(x.label)}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

const useStyles = makeStyles(() =>
  createStyles({
    block: {
      paddingLeft: '10px',
      paddingTop: '4px',
    },
  }),
);

export default MapStyleSelector;
