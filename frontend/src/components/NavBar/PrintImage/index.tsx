import { useRef, useState } from 'react';
import { IconButton } from '@material-ui/core';
import { useSelector } from 'react-redux';
import PrintOutlined from '@material-ui/icons/PrintOutlined';
import { mapSelector } from 'context/mapStateSlice/selectors';
import DownloadImage from './image';

function PrintImage() {
  const [openImage, setOpenImage] = useState(false);
  const selectedMap = useSelector(mapSelector);

  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleClose = () => {
    setOpenImage(false);
  };

  const openModal = () => {
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
          <PrintOutlined />
        </IconButton>
      </div>
      <DownloadImage open={openImage} handleClose={handleClose} />
    </>
  );
}

export default PrintImage;
