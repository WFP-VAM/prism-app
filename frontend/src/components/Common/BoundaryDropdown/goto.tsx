import React from 'react';
import { useSelector } from 'react-redux';
import { Button, Menu } from '@material-ui/core';
import RoomOutlinedIcon from '@material-ui/icons/RoomOutlined';
import { useSafeTranslation } from 'i18n';
import { BoundaryDropdownOptions } from 'components/MapView/Layers/BoundaryDropdown';
import { mapSelector } from 'context/mapStateSlice/selectors';

const GoToBoundaryDropdown = () => {
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
      <Button startIcon={<RoomOutlinedIcon />} onClick={handleClick}>
        {t('Go To')}
      </Button>
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
};

export default GoToBoundaryDropdown;
