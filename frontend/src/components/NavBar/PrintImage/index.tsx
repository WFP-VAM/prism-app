import { IconButton, useMediaQuery, useTheme } from '@material-ui/core';
import PrintOutlined from '@material-ui/icons/PrintOutlined';
import { usePostHog } from '@posthog/react';
import { DashboardExportDialog } from 'components/DashboardView/DashboardExport';
import { Panel } from 'config/types';
import { leftPanelTabValueSelector } from 'context/leftPanelStateSlice';
import { mapSelector } from 'context/mapStateSlice/selectors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { BATCH_MAP_LAYER_URL_KEY } from 'utils/constants';

import BatchMapExportGlobalTray from './batchMapExport/BatchMapExportGlobalTray';
import BatchMapExportJobsProvider from './batchMapExport/BatchMapExportJobsProvider';
import DownloadImage from './image';

function PrintImage() {
  const [openImage, setOpenImage] = useState(false);
  const [openDashboardExport, setOpenDashboardExport] = useState(false);
  const selectedMap = useSelector(mapSelector);
  const tabValue = useSelector(leftPanelTabValueSelector);
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));
  const history = useHistory();
  const location = useLocation();
  const posthog = usePostHog();

  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleClose = () => {
    setOpenImage(false);
    const params = new URLSearchParams(location.search);
    params.delete('printModal');
    params.delete('batchMaps');
    params.delete(BATCH_MAP_LAYER_URL_KEY);
    params.delete('schedule');
    history.replace({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    });
  };

  const handleCloseDashboardExport = () => {
    setOpenDashboardExport(false);
  };

  const openModal = useCallback(() => {
    // Check if we're in dashboard mode
    if (tabValue === Panel.Dashboard) {
      posthog?.capture('map_print_opened', { mode: 'dashboard' });
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
      posthog?.capture('map_print_opened', { mode: 'map' });
      setOpenImage(true);
    }
  }, [selectedMap, tabValue]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('printModal') === '1' && !openImage) {
      openModal();
    }
  }, [location.search, openImage, openModal]);

  return (
    <BatchMapExportJobsProvider>
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
        <DownloadImage open={openImage} handleClose={handleClose} />
        <BatchMapExportGlobalTray printDialogOpen={openImage} />
        {process.env.NODE_ENV !== 'test' && (
          <DashboardExportDialog
            open={openDashboardExport}
            handleClose={handleCloseDashboardExport}
          />
        )}
      </>
    </BatchMapExportJobsProvider>
  );
}

export default PrintImage;
