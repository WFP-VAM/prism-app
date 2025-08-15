import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import type { DashboardTextConfig } from 'config/types';
import { LayerDefinitions } from 'config/utils';
import { MapInstanceProvider } from 'components/MapView/MapInstanceContext';
import SwitchItem from 'components/MapView/MapInstanceComponents/SwitchItem';
import TextBlock from './TextBlock';
import DashboardMapComponent from './DashboardMap';

import {
  dashboardTitleSelector,
  setTitle,
  dashboardFlexElementsSelector,
} from '../../context/dashboardStateSlice';
// import DateSelector from 'components/MapView/DateSelector';

function DashboardView() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
  const dashboardFlexElements = useSelector(dashboardFlexElementsSelector);
  const dispatch = useDispatch();

  return (
    <Box className={classes.layout}>
      <Box className={classes.leadingContentArea}>
        <Box className={classes.grayCard}>
          <label className={classes.titleBarLabel}>
            <Typography
              variant="h2"
              component="span"
              className={classes.titleBarTypography}
            >
              Dashboard title
            </Typography>
            <input
              type="text"
              className={classes.titleBarInput}
              placeholder="Enter dashboard title"
              value={dashboardTitle}
              onChange={e => dispatch(setTitle(e.target.value))}
              name="dashboard-title"
            />
          </label>
        </Box>
        <Box className={classes.grayCard}>
          <div
            style={{
              height: '500px',
              width: '100%',
              display: 'flex',
            }}
          >
            <div style={{ padding: '1rem', width: '20%' }}>
              <Typography variant="h3">Layers</Typography>
              <MapInstanceProvider index={0}>
                <SwitchItem
                  layer={LayerDefinitions.precip_blended_dekad}
                  extent={[29, -27, 42, -9]}
                />
              </MapInstanceProvider>
            </div>
            <div
              style={{
                flex: 1,
                padding: '1rem',
              }}
            >
              <DashboardMapComponent />
            </div>
          </div>
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
  grayCard: {
    background: '#F1F1F1',
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
  },
  titleBarLabel: {
    display: 'flex',
    alignItems: 'center',
    marginRight: 16,
    fontWeight: 600,
    fontSize: 16,
    padding: 16,
  },
  titleBarTypography: {
    flex: '1 0 fit-content',
    marginInlineEnd: 16,
  },
  titleBarInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    background: 'white',
    fontFamily: 'Roboto',
  },
}));

export default DashboardView;
