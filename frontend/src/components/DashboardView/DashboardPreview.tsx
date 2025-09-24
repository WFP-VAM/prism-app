import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector } from 'react-redux';
import type { DashboardTextConfig } from 'config/types';
import TextBlock from './TextBlock';

import {
  dashboardTitleSelector,
  dashboardFlexElementsSelector,
  dashboardMapsSelector,
} from '../../context/dashboardStateSlice';
import MapBlock from './MapBlock';

function DashboardPreview() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dashboardMaps = useSelector(dashboardMapsSelector);

  return (
    <Box className={classes.layout}>
      <Box className={classes.leadingContentArea}>
        <Box>
          <Typography
            variant="h2"
            component="h1"
            className={classes.titleBarTypography}
          >
            {dashboardTitle || 'Untitled Dashboard'}
          </Typography>
        </Box>
        <div className={classes.mapsContainer}>
          {dashboardMaps.map((_, mapIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <Box key={`map-${mapIndex}`} className={classes.previewContainer}>
              <MapBlock mapIndex={mapIndex} mode="preview" />
            </Box>
          ))}
        </div>
      </Box>
      <Box className={classes.trailingContentArea}>
        {dashboardFlexElements?.map((element, index) => {
          if (element.type === 'TEXT') {
            const content = (element as DashboardTextConfig)?.content || '';
            return (
              <TextBlock
                // eslint-disable-next-line react/no-array-index-key
                key={`text-block-${index}`}
                content={content}
                index={index}
                mode="preview"
              />
            );
          }
          return <div>Content type not yet supported</div>;
        })}
      </Box>
    </Box>
  );
}

const useStyles = makeStyles(() => ({
  layout: {
    display: 'flex',
    padding: 16,
    margin: 16,
    gap: 16,
  },
  leadingContentArea: {
    flex: '2',
  },
  trailingContentArea: {
    flex: '1',
  },
  titleBarTypography: {
    padding: 16,
    fontWeight: 500,
    fontSize: 20,
    margin: 0,
  },
  previewContainer: {
    background: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  mapsContainer: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    height: '700px',
  },
}));

export default DashboardPreview;
