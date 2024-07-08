import React from 'react';
import { useSelector } from 'react-redux';
import { Button, IconButton, Menu, Typography } from '@material-ui/core';
import RoomOutlinedIcon from '@material-ui/icons/RoomOutlined';
import { useSafeTranslation } from 'i18n';
import BoundaryDropdownOptions from 'components/MapView/Layers/BoundaryDropdown/BoundaryDropdownOptions';
import { mapSelector } from 'context/mapStateSlice/selectors';

function GoToBoundaryDropdown() {
  const { t } = useSafeTranslation();
  const map = useSelector(mapSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = React.useState('');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {/* TODO: useMediaQuery */}
      {/* <Hidden smDown> */}
      <Button startIcon={<RoomOutlinedIcon />} onClick={handleClick}>
        <Typography style={{ color: '#FFF', textTransform: 'none' }}>
          {t('Go To')}
        </Typography>
      </Button>
      {/* </Hidden> */}
      {/* <Hidden mdUp> */}
      {false && (
        <IconButton style={{ color: 'white' }} onClick={handleClick}>
          <RoomOutlinedIcon />
        </IconButton>
      )}
      {/* </Hidden> */}

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <BoundaryDropdownOptions
          search={search}
          setSearch={setSearch}
          selectedBoundaries={[]}
          map={map}
        />
      </Menu>
    </>
  );
}

export default GoToBoundaryDropdown;
