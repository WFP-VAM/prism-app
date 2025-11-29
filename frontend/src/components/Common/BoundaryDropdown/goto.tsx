import React from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  IconButton,
  Menu,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RoomOutlinedIcon from '@mui/icons-material/RoomOutlined';
import { useSafeTranslation } from 'i18n';
import BoundaryDropdownOptions from 'components/MapView/Layers/BoundaryDropdown/BoundaryDropdownOptions';
import { mapSelector } from 'context/mapStateSlice/selectors';

function GoToBoundaryDropdown() {
  const { t } = useSafeTranslation();
  const map = useSelector(mapSelector);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = React.useState('');
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {!smDown && (
        <Button startIcon={<RoomOutlinedIcon />} onClick={handleClick}>
          <Typography style={{ color: '#FFF', textTransform: 'none' }}>
            {t('Go To')}
          </Typography>
        </Button>
      )}
      {!mdUp && (
        <IconButton style={{ color: 'white' }} onClick={handleClick}>
          <RoomOutlinedIcon />
        </IconButton>
      )}
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
