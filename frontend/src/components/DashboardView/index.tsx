import { Box, makeStyles, Typography } from '@material-ui/core';
import { useSelector, useDispatch } from 'react-redux';
import {
  dashboardTitleSelector,
  setTitle,
} from '../../context/dashboardStateSlice';
import TextBlock from './TextBlock';

function DashboardView() {
  const classes = useStyles();
  const dashboardTitle = useSelector(dashboardTitleSelector);
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
          <div>MAP PLACEHOLDER</div>
        </Box>
      </Box>
      <Box className={classes.trailingContentArea}>
        <TextBlock />
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
