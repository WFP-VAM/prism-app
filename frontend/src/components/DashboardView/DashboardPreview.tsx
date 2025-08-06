import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector } from 'react-redux';
import type { DashboardTextConfig } from 'config/types';
import TextBlock from './TextBlock';

import {
  dashboardTitleSelector,
  dashboardFlexElementsSelector,
} from '../../context/dashboardStateSlice';

function DashboardPreview() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);

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
}));

export default DashboardPreview;
