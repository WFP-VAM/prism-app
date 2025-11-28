import { useRef, useState } from 'react';
import { IconButton, useMediaQuery, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import PrintOutlined from '@mui/icons-material/PrintOutlined';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { Panel } from 'config/types';
import { DashboardExportDialog } from 'components/DashboardView/DashboardExport';
import DownloadImage from './image';

function PrintImage() {
  const [openImage, setOpenImage] = useState(false);
  const [openDashboardExport, setOpenDashboardExport] = useState(false);
  const selectedMap = useSelector(mapSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleClose = () => {
    setOpenImage(false);
  };

  const handleCloseDashboardExport = () => {
    setOpenDashboardExport(false);
  };

  const openModal = () => {
    // Check if we're in dashboard mode
    if (tabValue === Panel.Dashboard) {
      setOpenDashboardExport(true);
      return;
    }

    // Otherwise, open the map print dialog
    if (selectedMap) {
      const activeLayers = selectedMap.getCanvas();
      const canvas = previewRef.current;
      if (canvas) {
        canvas.setAttribute('width', activeLayers.width.toString());
        canvas.setAttribute('height', activeLayers.height.toString());
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(activeLayers, 0, 0);
        }
      }
      setOpenImage(true);
    }
  };

  return (
    <>
      <div style={{ paddingTop: '4px' }}>
        <IconButton
          onClick={openModal}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
          }}
        >
          <PrintOutlined style={{ fontSize: mdUp ? '1.25rem' : '1.5rem' }} />
        </IconButton>
      </div>
      {/* Map Print Dialog */}
      <DownloadImage open={openImage} handleClose={handleClose} />
      {/* Dashboard Export Dialog - don't show in snapshots */}
      {process.env.NODE_ENV !== 'test' && (
        <DashboardExportDialog
          open={openDashboardExport}
          handleClose={handleCloseDashboardExport}
        />
      )}
    </>
  );
}

export default PrintImage;
